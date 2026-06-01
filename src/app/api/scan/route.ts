import { NextRequest, NextResponse } from "next/server";
import { prodGuard } from "@/lib/local-only-guard";
import { scan } from "@/lib/indexer/scanner";
import { stats } from "@/lib/indexer/db";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guard = prodGuard("Assets indexer (scan)");
  if (guard) return guard;
  const body = await req.json().catch(() => ({}));
  const result = await scan({
    projectRoots: body.projectRoots,
    fullRebuild: body.fullRebuild,
  });
  return NextResponse.json({ ...result, stats: stats() });
}

export async function GET() {
  return NextResponse.json(stats());
}
