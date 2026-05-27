import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { key, text, mode } = await req.json();
  if (!key || !text) return NextResponse.json({ error: "missing key or text" }, { status: 400 });

  const system = mode === "digest"
    ? "You produce a 3-bullet digest of unread email. Each bullet ≤ 18 words, mentions sender + action. Return raw markdown bullets, no preamble."
    : "You summarize a single email in 1 line: who it's from, what they want, urgency. ≤ 24 words. Return plain text only.";

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    }),
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 502 });
  const j = await r.json();
  const summary = j?.choices?.[0]?.message?.content?.trim();
  return NextResponse.json({ summary });
}
