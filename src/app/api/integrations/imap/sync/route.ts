import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// LifeHub's IMAP path delegates entirely to the sibling Postbox app.
// Postbox owns the IMAP daemon, MIME parsing, IDLE push, SMTP. We just
// forward the sync request and surface the count back to the dashboard.
//
// Config: set POSTBOX_URL in .env.local (default http://localhost:5180).
//
// Body (optional): { accountId?: string }
//   - If omitted, Postbox will sync all IMAP accounts for the local user.

export async function POST(req: NextRequest) {
  const base = process.env.POSTBOX_URL || "http://localhost:5180";
  let body: { accountId?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  // Postbox doesn't yet have a "sync all" endpoint — caller must pass an
  // accountId. If absent, surface a friendly hint.
  if (!body.accountId) {
    return NextResponse.json({
      ok: false,
      error: "missing-account-id",
      hint: `Pass { accountId } in the request body. List accounts at ${base}/accounts.`,
    }, { status: 400 });
  }

  try {
    const r = await fetch(`${base}/api/accounts/${body.accountId}/sync`, {
      method: "POST",
      cache: "no-store",
    });
    const json = await r.json();
    if (!json.ok) {
      return NextResponse.json({ ok: false, error: json.error ?? "postbox-sync-failed", detail: json }, { status: r.status });
    }
    return NextResponse.json({
      ok: true,
      added: json.added,
      updated: json.updated,
      total: json.fetched,
      bridgedToLifeHub: json.bridgedToLifeHub ?? 0,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: "postbox-unreachable",
      hint: `Could not reach Postbox at ${base}. Is it running on port 5180?`,
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 502 });
  }
}
