import { NextResponse } from "next/server";
import { listEntries, categoriesPresent } from "@/lib/vault/reader";
import { prodGuard } from "@/lib/local-only-guard";

export const runtime = "nodejs";

export async function GET() {
  const guard = prodGuard("Vault"); if (guard) return guard;
  const cats = await categoriesPresent();
  if (!cats.ok) {
    return NextResponse.json(
      { error: "vault not initialized", missing: cats.missing },
      { status: 503 },
    );
  }
  const entries = await listEntries();
  return NextResponse.json({
    count: entries.length,
    entries: entries.map(e => ({
      path: e.path,
      id: e.frontmatter.id,
      type: e.frontmatter.type,
      title: e.frontmatter.title || e.frontmatter.id,
      tags: e.frontmatter.tags,
      projects: e.frontmatter.projects,
      status: e.frontmatter.status,
      created: e.frontmatter.created,
      updated: e.frontmatter.updated,
      preview: e.body.slice(0, 240),
    })),
  });
}
