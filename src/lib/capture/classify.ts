"use client";
import { db } from "../db/schema";

export type Classified =
  | { kind: "task";    text: string; due?: string; chipCls?: string; chipLabel?: string }
  | { kind: "note";    title: string; body: string; tag?: string }
  | { kind: "capture"; body: string; tags: string[]; subKind?: "text" | "link" };

const DUE_WORDS = ["today", "tomorrow", "mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function extractDue(text: string): string | undefined {
  const m = text.match(/@(\w+)/);
  if (!m) return undefined;
  const w = m[1].toLowerCase();
  return DUE_WORDS.find(d => w.startsWith(d));
}

function extractAreaChip(text: string): { chipCls?: string; chipLabel?: string } {
  const t = text.toLowerCase();
  if (/(work|email|meeting|standup|review|prd|q[1-4])/.test(t)) return { chipCls: "work",   chipLabel: "Work"   };
  if (/(gym|run|workout|stretch|sleep|water|hydrate)/.test(t)) return { chipCls: "health", chipLabel: "Health" };
  if (/(call mom|landlord|kitchen|laundry|grocer|dinner|recipe)/.test(t)) return { chipCls: "home", chipLabel: "Home" };
  if (/(read|study|focus|deep work|book)/.test(t)) return { chipCls: "focus", chipLabel: "Focus" };
  return {};
}

export function regexClassify(input: string): Classified {
  const v = input.trim();
  const isUrl = /^https?:\/\/\S+$/i.test(v);
  if (isUrl) {
    return { kind: "capture", body: v, tags: ["link"], subKind: "link" };
  }
  if (/^(todo|task):/i.test(v)) {
    const text = v.replace(/^(todo|task):\s*/i, "");
    return { kind: "task", text, due: extractDue(text), ...extractAreaChip(text) };
  }
  if (/^note:/i.test(v)) {
    const body = v.replace(/^note:\s*/i, "");
    const title = body.split("\n")[0].slice(0, 80) || "Untitled";
    const tagMatch = body.match(/#(\w+)/);
    return { kind: "note", title, body, tag: tagMatch?.[1] };
  }
  // Bare @today/@tomorrow → assume task
  if (extractDue(v)) {
    return { kind: "task", text: v, due: extractDue(v), ...extractAreaChip(v) };
  }
  const tags = Array.from(v.matchAll(/#(\w+)/g)).map(m => m[1]);
  return { kind: "capture", body: v, tags, subKind: "text" };
}

export async function aiClassify(input: string): Promise<Classified | null> {
  const cfg = (await db().settings.get("openai"))?.value as { key?: string } | undefined;
  if (!cfg?.key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content:
            "You are a triage classifier for a personal dashboard. Return JSON only. " +
            "Decide if the input is a `task` (something to do), a `note` (knowledge/journal), or a `capture` (raw input to triage later). " +
            "For tasks emit { kind:'task', text, due?, chipCls?: 'work'|'home'|'health'|'focus', chipLabel? }. " +
            "For notes emit { kind:'note', title, body, tag? }. " +
            "For captures emit { kind:'capture', body, tags, subKind:'text'|'link' }." },
          { role: "user", content: input },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content;
    if (!txt) return null;
    const parsed = JSON.parse(txt);
    if (!parsed?.kind) return null;
    return parsed as Classified;
  } catch (err) {
    console.warn("[lifehub] aiClassify failed", err);
    return null;
  }
}

export async function classify(input: string): Promise<Classified> {
  const ai = await aiClassify(input);
  return ai || regexClassify(input);
}
