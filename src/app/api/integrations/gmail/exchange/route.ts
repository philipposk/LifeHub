import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { code, clientId, clientSecret, redirectUri } = await req.json();
  if (!code || !clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const form = new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: redirectUri, grant_type: "authorization_code",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 502 });
  const j = await r.json();

  // Resolve email of the authorized user
  let email = "";
  try {
    const ur = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${j.access_token}` },
    });
    if (ur.ok) email = (await ur.json()).email || "";
  } catch {}

  return NextResponse.json({
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresIn: j.expires_in,
    email,
  });
}
