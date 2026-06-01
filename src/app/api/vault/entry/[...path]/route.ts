import { NextRequest, NextResponse } from "next/server";
import { readEntry } from "@/lib/vault/reader";
import { updateEntry, deleteEntry } from "@/lib/vault/writer";
import { prodGuard } from "@/lib/local-only-guard";

export const runtime = "nodejs";

function relFrom(params: { path: string[] }): string {
  return params.path.map(decodeURIComponent).join("/");
}

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const guard = prodGuard("Vault"); if (guard) return guard;
  try {
    const entry = await readEntry(relFrom(params));
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const guard = prodGuard("Vault"); if (guard) return guard;
  try {
    const body = await req.json();
    const entry = await updateEntry(relFrom(params), {
      body: body.body,
      meta: body.meta,
    });
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const guard = prodGuard("Vault"); if (guard) return guard;
  try {
    await deleteEntry(relFrom(params));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
