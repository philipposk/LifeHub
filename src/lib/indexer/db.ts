import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * SQLite store for the cross-project asset index.
 *
 * Schema:
 *   assets        — one row per indexed asset (vault entry OR external file)
 *   assets_fts    — FTS5 virtual table over title + body for keyword search
 *
 * No external service. Pure on-disk file at ~/SecondBrain/.cache/index.db.
 */

let _db: Database.Database | null = null;

function dbPath(): string {
  const dir = process.env.INDEX_DIR
    || path.join(os.homedir(), "SecondBrain", ".cache");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "index.db");
}

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(dbPath());
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  init(_db);
  return _db;
}

function init(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id          TEXT PRIMARY KEY,
      source      TEXT NOT NULL,           -- 'vault' | 'project'
      project     TEXT,                    -- name of the project dir (e.g. 'AI OS')
      type        TEXT NOT NULL,           -- prompt|snippet|agent|...
      title       TEXT,
      tags        TEXT,                    -- JSON array
      path        TEXT NOT NULL,           -- absolute path
      vault_path  TEXT,                    -- relative vault path if source='vault'
      created     TEXT,
      updated     TEXT,
      indexed_at  INTEGER NOT NULL,
      preview     TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_assets_type    ON assets(type);
    CREATE INDEX IF NOT EXISTS idx_assets_source  ON assets(source);
    CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project);

    CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts USING fts5(
      id UNINDEXED,
      title,
      body,
      tags,
      tokenize = 'porter unicode61'
    );
  `);
}

export interface AssetRow {
  id: string;
  source: "vault" | "project";
  project?: string;
  type: string;
  title?: string;
  tags: string[];
  path: string;
  vault_path?: string;
  created?: string;
  updated?: string;
  preview?: string;
}

export function upsertAsset(row: AssetRow, body: string): void {
  const db = getDb();
  const tagsJson = JSON.stringify(row.tags || []);
  const indexedAt = Date.now();
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO assets (id, source, project, type, title, tags, path, vault_path, created, updated, indexed_at, preview)
      VALUES (@id, @source, @project, @type, @title, @tags, @path, @vault_path, @created, @updated, @indexed_at, @preview)
      ON CONFLICT(id) DO UPDATE SET
        source = excluded.source,
        project = excluded.project,
        type = excluded.type,
        title = excluded.title,
        tags = excluded.tags,
        path = excluded.path,
        vault_path = excluded.vault_path,
        updated = excluded.updated,
        indexed_at = excluded.indexed_at,
        preview = excluded.preview
    `).run({
      id: row.id,
      source: row.source,
      project: row.project ?? null,
      type: row.type,
      title: row.title ?? null,
      tags: tagsJson,
      path: row.path,
      vault_path: row.vault_path ?? null,
      created: row.created ?? null,
      updated: row.updated ?? null,
      indexed_at: indexedAt,
      preview: row.preview ?? null,
    });
    db.prepare(`DELETE FROM assets_fts WHERE id = ?`).run(row.id);
    db.prepare(`INSERT INTO assets_fts (id, title, body, tags) VALUES (?, ?, ?, ?)`)
      .run(row.id, row.title ?? "", body || "", row.tags.join(" "));
  });
  tx();
}

export function clearAll(): void {
  const db = getDb();
  db.exec("DELETE FROM assets; DELETE FROM assets_fts;");
}

export interface SearchHit {
  id: string;
  source: string;
  project?: string;
  type: string;
  title?: string;
  tags: string[];
  path: string;
  vault_path?: string;
  preview?: string;
  snippet?: string;
  rank?: number;
}

export interface SearchOpts {
  q?: string;
  type?: string;
  project?: string;
  source?: string;
  tag?: string;
  limit?: number;
}

export function searchAssets(opts: SearchOpts): SearchHit[] {
  const db = getDb();
  const limit = Math.min(opts.limit || 50, 200);
  if (opts.q && opts.q.trim().length > 0) {
    // FTS path with optional filter clauses
    const ftsQuery = sanitizeFts(opts.q);
    const filters: string[] = [];
    const params: Record<string, unknown> = { q: ftsQuery, limit };
    if (opts.type)    { filters.push("a.type = @type");       params.type = opts.type; }
    if (opts.project) { filters.push("a.project = @project"); params.project = opts.project; }
    if (opts.source)  { filters.push("a.source = @source");   params.source = opts.source; }
    if (opts.tag)     { filters.push("a.tags LIKE @tag");     params.tag = `%"${opts.tag}"%`; }
    const where = filters.length ? `AND ${filters.join(" AND ")}` : "";
    const rows = db.prepare(`
      SELECT a.*, snippet(assets_fts, 1, char(2), char(3), '…', 12) AS snippet, rank
      FROM assets_fts
      JOIN assets a ON a.id = assets_fts.id
      WHERE assets_fts MATCH @q ${where}
      ORDER BY rank
      LIMIT @limit
    `).all(params);
    return rows.map(toHit);
  } else {
    const filters: string[] = [];
    const params: Record<string, unknown> = { limit };
    if (opts.type)    { filters.push("type = @type");       params.type = opts.type; }
    if (opts.project) { filters.push("project = @project"); params.project = opts.project; }
    if (opts.source)  { filters.push("source = @source");   params.source = opts.source; }
    if (opts.tag)     { filters.push("tags LIKE @tag");     params.tag = `%"${opts.tag}"%`; }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = db.prepare(`SELECT * FROM assets ${where} ORDER BY updated DESC LIMIT @limit`).all(params);
    return rows.map(toHit);
  }
}

function toHit(r: any): SearchHit {
  return {
    id: r.id,
    source: r.source,
    project: r.project || undefined,
    type: r.type,
    title: r.title || undefined,
    tags: r.tags ? JSON.parse(r.tags) : [],
    path: r.path,
    vault_path: r.vault_path || undefined,
    preview: r.preview || undefined,
    snippet: r.snippet || undefined,
    rank: r.rank ?? undefined,
  };
}

/** Strip FTS5 syntax chars to avoid query errors from free-text input. */
function sanitizeFts(q: string): string {
  return q
    .replace(/["()*:^]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(t => `${t}*`)
    .join(" ");
}

export function stats(): { total: number; bySource: Record<string, number>; byType: Record<string, number> } {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as c FROM assets").get() as any).c as number;
  const bySource = Object.fromEntries(
    (db.prepare("SELECT source, COUNT(*) as c FROM assets GROUP BY source").all() as any[])
      .map(r => [r.source, r.c]),
  );
  const byType = Object.fromEntries(
    (db.prepare("SELECT type, COUNT(*) as c FROM assets GROUP BY type").all() as any[])
      .map(r => [r.type, r.c]),
  );
  return { total, bySource, byType };
}
