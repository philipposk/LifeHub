import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const DEFAULT_DIR = process.env.APPBLUEPRINTS_DATA_DIR
  || path.join(os.homedir(), "Devoloper Projects", "AppBlueprints", "data", "mcps");

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    const out: string[] = [];
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const sub = await listJsonFiles(p);
        out.push(...sub);
      } else if (e.isFile() && /\.(json|ya?ml)$/i.test(e.name)) {
        out.push(p);
      }
    }
    return out;
  } catch {
    return [];
  }
}

function safeParse(text: string, file: string) {
  try { return JSON.parse(text); } catch {
    return { name: path.basename(file).replace(/\.[^.]+$/, ""), description: text.slice(0, 300) };
  }
}

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get("dir") || DEFAULT_DIR;
  const abs = path.resolve(dir);
  if (!abs.startsWith("/")) {
    return NextResponse.json({ error: "must be absolute path" }, { status: 400 });
  }
  const files = await listJsonFiles(abs);
  const entries: any[] = [];
  for (const f of files) {
    try {
      const text = await fs.readFile(f, "utf8");
      const j = safeParse(text, f);
      const name = j.name || j.id || path.basename(f).replace(/\.[^.]+$/, "");
      entries.push({
        id: name,
        name,
        description: j.description || j.summary,
        category: j.category || j.type,
        raw: j,
      });
    } catch (err) {
      // skip
    }
  }
  return NextResponse.json({ dir: abs, count: entries.length, entries });
}
