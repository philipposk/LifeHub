import { NextRequest, NextResponse } from "next/server";
import { writeNewEntry } from "@/lib/vault/writer";
import { VAULT_TYPES } from "@/lib/vault/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
