import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Hdr = { name: string; value: string };

function pickHdr(headers: Hdr[], name: string): string | undefined {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function parseFrom(raw?: string): { from: string; fromEmail?: string } {
  if (!raw) return { from: "" };
  // "Name <email@x.com>" or "email@x.com"
  const m = raw.match(/^(.*?)<([^>]+)>\s*$/);
  if (m) return { from: m[1].trim().replace(/^"|"$/g, "") || m[2], fromEmail: m[2] };
  return { from: raw, fromEmail: raw };
}

export async function POST(req: NextRequest) {
  const { accessToken, limit = 25, query = "is:unread OR is:starred" } = await req.json();
  if (!accessToken) return NextResponse.json({ error: "missing accessToken" }, { status: 400 });

  const listURL = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&q=${encodeURIComponent(query)}`;
  const listR = await fetch(listURL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listR.ok) {
    const body = await listR.text();
    console.error("[gmail/sync] list failed", listR.status, body);
    let parsed: any = null;
    try { parsed = JSON.parse(body); } catch {}
    return NextResponse.json({
      error: parsed?.error?.message || body.slice(0, 500),
      status: listR.status,
      reason: parsed?.error?.errors?.[0]?.reason,
    }, { status: 502 });
  }
  const listJ = await listR.json();
  const ids: { id: string; threadId: string }[] = listJ.messages || [];

  const messages: any[] = [];
  for (const m of ids) {
    const r = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!r.ok) continue;
    const j = await r.json();
    const hdrs: Hdr[] = j.payload?.headers || [];
    const { from, fromEmail } = parseFrom(pickHdr(hdrs, "From"));
    const subject = pickHdr(hdrs, "Subject");
    const dateStr = pickHdr(hdrs, "Date");
    const receivedAt = dateStr ? new Date(dateStr).getTime() : (j.internalDate ? Number(j.internalDate) : Date.now());
    const labels: string[] = j.labelIds || [];
    messages.push({
      id: j.id,
      threadId: j.threadId,
      from, fromEmail, subject,
      snippet: j.snippet,
      receivedAt,
      labels,
      unread: labels.includes("UNREAD"),
      starred: labels.includes("STARRED"),
    });
  }
  return NextResponse.json({ messages });
}
