import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// IMAP triage in LifeHub is intentionally a stub. Full IMAP fetching (with
// thread reconstruction, body parsing, attachments, idle push) lives in the
// sibling "Triage" app — see /Users/phktistakis/Devoloper Projects/Triage/PLAN.md.
//
// When Triage is up, point LifeHub at it via the Triage HTTP API and let it
// do the heavy lifting; LifeHub stays a thin triage surface.

export async function POST(_req: NextRequest) {
  return NextResponse.json({
    ok: false,
    error: "imap-not-implemented-in-lifehub",
    hint: "Run the Triage app (Devoloper Projects/Triage/) to handle IMAP. LifeHub will then read from Triage's API.",
  }, { status: 501 });
}
