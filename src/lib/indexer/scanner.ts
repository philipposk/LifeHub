import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import matter from "gray-matter";
import { upsertAsset, clearAll, AssetRow } from "./db";
import { listEntries } from "@/lib/vault/reader";

/**
 * Cross-project asset scanner.
 *
 * Sources:
 *   1. Vault entries (Markdown with frontmatter under ~/SecondBrain/vault).
 *   2. External project files matching extractor heuristics:
 *      - AGENTS.md / CLAUDE.md / AI_INSTRUCTIONS.md → type: agent
 *      - .mcp.json / mcp.json                       → type: agent
 *      - *.prompt.md                                → type: prompt
 *      - docs/prompt_logs/*                         → type: prompt
 *      - data/{harnesses,skills,mcps,stacks}/*.yml  → type: template (from AppBlueprints)
 *      - **\/v0SystemPrompts.* + similar            → type: prompt
 */

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", ".venv", "venv",
  ".cache", ".turbo", "coverage", ".pnpm-store", "__pycache__", ".pytest_cache",
  ".idea", ".vscode", ".DS_Store",
]);

const MAX_FILE_BYTES = 256 * 1024; // skip files larger than 256KB

export interface ScanResult {
  vaultIndexed: number;
  projectsIndexed: number;
  errors: string[];
}

export interface ScanOpts {
  /** Root directories to scan for projects (read-only). */
  projectRoots?: string[];
  /** Wipe index first. */
  fullRebuild?: boolean;
}

export async function scan(opts: ScanOpts = {}): Promise<ScanResult> {
  const projectRoots = opts.projectRoots
    || (process.env.PROJECT_ROOTS?.split(":") ?? [defaultProjectRoot()]);

  if (opts.fullRebuild) clearAll();

  const errors: string[] = [];
  let vaultIndexed = 0;
  let projectsIndexed = 0;

  // 1. vault
  try {
    const entries = await listEntries();
    for (const e of entries) {
      try {
        upsertAsset(
          {
            id: `vault:${e.path}`,
            source: "vault",
            type: e.frontmatter.type,
            title: e.frontmatter.title || e.frontmatter.id,
            tags: e.frontmatter.tags || [],
            path: e.absPath,
            vault_path: e.path,
            created: e.frontmatter.created,
            updated: e.frontmatter.updated,
            preview: e.body.slice(0, 240),
          },
          e.body,
        );
        vaultIndexed++;
      } catch (err) {
        errors.push(`vault:${e.path}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    errors.push(`vault list: ${(err as Error).message}`);
  }

  // 2. external projects
  for (const root of projectRoots) {
    try {
      const projectDirs = await fs.readdir(root, { withFileTypes: true });
      for (const d of projectDirs) {
        if (!d.isDirectory()) continue;
        if (d.name.startsWith(".")) continue;
        const projectPath = path.join(root, d.name);
        const indexed = await indexProject(projectPath, d.name, errors);
        projectsIndexed += indexed;
      }
    } catch (err) {
      errors.push(`root ${root}: ${(err as Error).message}`);
    }
  }

  return { vaultIndexed, projectsIndexed, errors };
}

async function indexProject(projectPath: string, projectName: string, errors: string[]): Promise<number> {
  let count = 0;
  await walk(projectPath, async (abs, rel) => {
    const row = match(abs, rel, projectName);
    if (!row) return;
    try {
      const stat = await fs.stat(abs);
      if (stat.size > MAX_FILE_BYTES) return;
      const raw = await fs.readFile(abs, "utf8");
      let body = raw;
      let tags = row.tags;
      try {
        const parsed = matter(raw);
        if (parsed.content) body = parsed.content;
        if (Array.isArray(parsed.data?.tags)) tags = parsed.data.tags;
      } catch { /* not all files have frontmatter */ }
      upsertAsset(
        { ...row, tags, preview: body.slice(0, 240) },
        body,
      );
      count++;
    } catch (err) {
      errors.push(`${abs}: ${(err as Error).message}`);
    }
  });
  return count;
}

async function walk(dir: string, fn: (abs: string, rel: string) => Promise<void>, root = dir): Promise<void> {
  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch { return; }
  for (const d of dirents) {
    if (SKIP_DIRS.has(d.name)) continue;
    if (d.name.startsWith(".") && d.name !== ".mcp.json") continue;
    const abs = path.join(dir, d.name);
    if (d.isDirectory()) {
      await walk(abs, fn, root);
    } else if (d.isFile()) {
      const rel = path.relative(root, abs);
      await fn(abs, rel);
    }
  }
}

/**
 * Classify a file by heuristic. Returns null if not interesting.
 */
function match(abs: string, rel: string, project: string): Omit<AssetRow, "preview"> | null {
  const base = path.basename(abs);
  const lower = base.toLowerCase();
  const id = `proj:${project}:${rel}`;
  const common = { id, source: "project" as const, project, path: abs, tags: [project.toLowerCase()] };

  // Agent / coding-tool config files
  if (["agents.md", "claude.md", "ai_instructions.md", ".mcp.json", "mcp.json"].includes(lower)) {
    return { ...common, type: "agent", title: `${project} / ${base}` };
  }

  // AppBlueprints data files
  if (rel.includes(path.join("data", "harnesses")) && lower.endsWith(".yml")) {
    return { ...common, type: "template", title: `harness: ${base}`, tags: [...common.tags, "harness"] };
  }
  if (rel.includes(path.join("data", "skills")) && (lower.endsWith(".yml") || lower.endsWith(".yaml"))) {
    return { ...common, type: "template", title: `skill: ${base}`, tags: [...common.tags, "skill"] };
  }
  if (rel.includes(path.join("data", "mcps")) && (lower.endsWith(".yml") || lower.endsWith(".yaml"))) {
    return { ...common, type: "template", title: `mcp: ${base}`, tags: [...common.tags, "mcp"] };
  }
  if (rel.includes(path.join("data", "stacks")) && (lower.endsWith(".yml") || lower.endsWith(".yaml"))) {
    return { ...common, type: "template", title: `stack: ${base}`, tags: [...common.tags, "stack"] };
  }

  // Prompt files
  if (lower.endsWith(".prompt.md") || lower.endsWith(".prompt.txt")) {
    return { ...common, type: "prompt", title: `${project} / ${base}` };
  }
  if (rel.includes(path.join("docs", "prompt_logs"))) {
    return { ...common, type: "prompt", title: `${project} / ${base}` };
  }
  if (lower.includes("systemprompt") || lower.includes("system_prompt")) {
    return { ...common, type: "prompt", title: `${project} / ${base}` };
  }

  return null;
}

function defaultProjectRoot(): string {
  return path.join(os.homedir(), "Devoloper Projects");
}
