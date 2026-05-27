import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { safeJoin, vaultRoot } from "./paths";
import {
  VaultEntry,
  VaultFrontmatter,
  VaultType,
  TYPE_TO_DIR,
  slugify,
  today,
} from "./schema";

export interface WriteEntryInput {
  type: VaultType;
  title?: string;
  body: string;
  /** Frontmatter overrides — id, tags, projects, etc. */
  meta?: Partial<VaultFrontmatter>;
  /** Optional explicit filename (without extension). */
  slug?: string;
}

/**
 * Write a new vault entry to the category dir for its `type`.
 * Returns the relative vault path.
 */
export async function writeNewEntry(input: WriteEntryInput): Promise<VaultEntry> {
  const dir = TYPE_TO_DIR[input.type];
  const baseSlug = input.slug || slugify(input.title || input.body.slice(0, 40) || "untitled");
  const slug = await ensureUniqueSlug(dir, baseSlug);
  const id = input.meta?.id || slug;
  const now = today();
  const fm = VaultFrontmatter.parse({
    id,
    type: input.type,
    title: input.title,
    tags: input.meta?.tags || [],
    projects: input.meta?.projects || [],
    status: input.meta?.status || "active",
    created: input.meta?.created || now,
    updated: input.meta?.updated || now,
    domain: input.meta?.domain,
    source: input.meta?.source,
    related: input.meta?.related || [],
  });
  const rel = path.join(dir, `${slug}.md`);
  const abs = safeJoin(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const content = matter.stringify(input.body, stripUndefined(fm));
  await fs.writeFile(abs, content, "utf8");
  return { path: rel, absPath: abs, frontmatter: fm, body: input.body };
}

/** gray-matter / js-yaml refuses `undefined` values. Drop them. */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Overwrite an existing entry by relative path. Frontmatter merged. */
export async function updateEntry(
  rel: string,
  patch: { body?: string; meta?: Partial<VaultFrontmatter> },
): Promise<VaultEntry> {
  const abs = safeJoin(rel);
  const existing = await fs.readFile(abs, "utf8");
  const parsed = matter(existing);
  const merged = VaultFrontmatter.parse({
    ...parsed.data,
    ...(patch.meta || {}),
    updated: today(),
  });
  const body = patch.body ?? parsed.content;
  const content = matter.stringify(body, stripUndefined(merged));
  await fs.writeFile(abs, content, "utf8");
  return { path: rel, absPath: abs, frontmatter: merged, body };
}

/** Delete an entry. */
export async function deleteEntry(rel: string): Promise<void> {
  const abs = safeJoin(rel);
  await fs.unlink(abs);
}

async function ensureUniqueSlug(dir: string, slug: string): Promise<string> {
  const root = vaultRoot();
  const tryName = async (name: string): Promise<boolean> => {
    try { await fs.stat(path.join(root, dir, `${name}.md`)); return false; }
    catch { return true; }
  };
  if (await tryName(slug)) return slug;
  for (let i = 2; i < 1000; i++) {
    const alt = `${slug}-${i}`;
    if (await tryName(alt)) return alt;
  }
  return `${slug}-${Date.now()}`;
}
