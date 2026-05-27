import { z } from "zod";

/**
 * Vault asset schema — the YAML frontmatter contract for every markdown file
 * stored under ~/SecondBrain/vault/<Category>/<id>.md.
 *
 * Categories map to top-level dirs: Projects, Prompts, Code, Research, Agents,
 * Templates, SOPs, Datasets, Ideas.
 */

export const VAULT_TYPES = [
  "prompt",
  "snippet",
  "agent",
  "research",
  "sop",
  "template",
  "dataset",
  "idea",
  "project",
] as const;

export type VaultType = typeof VAULT_TYPES[number];

/** Map vault type → on-disk category directory. */
export const TYPE_TO_DIR: Record<VaultType, string> = {
  prompt: "Prompts",
  snippet: "Code",
  agent: "Agents",
  research: "Research",
  sop: "SOPs",
  template: "Templates",
  dataset: "Datasets",
  idea: "Ideas",
  project: "Projects",
};

export const VAULT_CATEGORIES = Object.values(TYPE_TO_DIR);

export const VaultStatus = z.enum(["active", "draft", "archived"]);
export type VaultStatus = z.infer<typeof VaultStatus>;

/**
 * YAML frontmatter schema. Loose on optional fields so legacy notes still parse.
 */
export const VaultFrontmatter = z.object({
  id: z.string().min(1),
  type: z.enum(VAULT_TYPES),
  domain: z.string().optional(),
  tags: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  created: z.string().optional(),  // ISO date
  updated: z.string().optional(),
  status: VaultStatus.default("active"),
  source: z.string().optional(),
  related: z.array(z.string()).default([]),
  title: z.string().optional(),
}).passthrough();

export type VaultFrontmatter = z.infer<typeof VaultFrontmatter>;

export interface VaultEntry {
  /** Path relative to vault root, e.g. "Prompts/foo.md". */
  path: string;
  /** Absolute path on disk. */
  absPath: string;
  frontmatter: VaultFrontmatter;
  body: string;
}

/** Slugify a string for use as an id or filename. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

/** Today's date in YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
