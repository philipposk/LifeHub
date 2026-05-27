import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/indexer/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q       = url.searchParams.get("q")       || undefined;
  const type    = url.searchParams.get("type")    || undefined;
  const project = url.searchParams.get("project") || undefined;
  const source  = url.searchParams.get("source")  || undefined;
  const tag     = url.searchParams.get("tag")     || undefined;
  const limit   = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50;
  const hits = searchAssets({ q, type, project, source, tag, limit });
  return NextResponse.json({ count: hits.length, hits });
}
