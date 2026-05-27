import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { vaultRoot, safeJoin } from "./paths";
import { VaultEntry, VaultFrontmatter, VAULT_CATEGORIES } from "./schema";

const MD_RE = /\.mdx?$/i;

/** Read one entry by vault-relative path (e.g. "Prompts/foo.md"). */
export async function readEntry(rel: string): Promise<VaultEntry> {
  const abs = safeJoin(rel);
  const raw = await fs.readFile(abs, "utf8");
  const parsed = matter(raw);
  const fm = VaultFrontmatter.parse({
    ...parsed.data,
    id: parsed.data.id || path.basename(rel, path.extname(rel)),
    type: parsed.data.type || inferTypeFromPath(rel),
    tags: parsed.data.tags || [],
    projects: parsed.data.projects || [],
    related: parsed.data.related || [],
  });
  return { path: rel, absPath: abs, frontmatter: fm, body: parsed.content };
}

/** Walk the vault and return every markdown entry. README.md files are skipped. */
export async function listEntries(): Promise<VaultEntry[]> {
  const root = vaultRoot();
  const entries: VaultEntry[] = [];
  await walk(root, root, entries);
  return entries;
}

async function walk(dir: string, root: string, out: VaultEntry[]): Promise<void> {
  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const d of dirents) {
    const abs = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (d.name.startsWith(".")) continue;
      await walk(abs, root, out);
    } else if (d.isFile() && MD_RE.test(d.name) && d.name.toLowerCase() !== "readme.md") {
      const rel = path.relative(root, abs);
      try {
        out.push(await readEntry(rel));
      } catch (err) {
        // skip files that fail schema validation, but log
        console.warn(`[vault.reader] skip ${rel}:`, (err as Error).message);
      }
    }
  }
}

/** Best-guess `type` from the category dir in path. */
function inferTypeFromPath(rel: string): string {
  const top = rel.split(path.sep)[0];
  switch (top) {
    case "Prompts":   return "prompt";
    case "Code":      return "snippet";
    case "Agents":    return "agent";
    case "Research":  return "research";
    case "SOPs":      return "sop";
    case "Templates": return "template";
    case "Datasets":  return "dataset";
    case "Ideas":     return "idea";
    case "Projects":  return "project";
    default:          return "idea";
  }
}

/** Sanity: confirm vault root has expected category dirs. */
export async function categoriesPresent(): Promise<{ ok: boolean; missing: string[] }> {
  const root = vaultRoot();
  const missing: string[] = [];
  for (const c of VAULT_CATEGORIES) {
    try {
      const s = await fs.stat(path.join(root, c));
      if (!s.isDirectory()) missing.push(c);
    } catch {
      missing.push(c);
    }
  }
  return { ok: missing.length === 0, missing };
}
