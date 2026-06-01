import { NextRequest, NextResponse } from "next/server";
import { writeNewEntry } from "@/lib/vault/writer";
import { VAULT_TYPES } from "@/lib/vault/schema";
import { prodGuard } from "@/lib/local-only-guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const guard = prodGuard("Vault"); if (guard) return guard;
  try {
    const body = await req.json();
    if (!VAULT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `bad type. expected one of: ${VAULT_TYPES.join(",")}` },
        { status: 400 },
      );
    }
    const entry = await writeNewEntry({
      type: body.type,
      title: body.title,
      body: body.body || "",
      meta: body.meta,
      slug: body.slug,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
