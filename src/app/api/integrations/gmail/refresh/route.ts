import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { refreshToken, clientId, clientSecret } = await req.json();
  if (!refreshToken || !clientId || !clientSecret) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const form = new URLSearchParams({
    refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 502 });
  const j = await r.json();
  return NextResponse.json({ accessToken: j.access_token, expiresIn: j.expires_in });
}
