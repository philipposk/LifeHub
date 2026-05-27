"use client";
import { db, uid, LOCAL_USER_ID } from "../db/schema";

// Minimal RFC5545 parser — handles VEVENT with DTSTART/DTEND/SUMMARY/DESCRIPTION/UID.
// Supports VALUE=DATE (all-day, treated as midnight local), TZID is approximated as local.

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const ln of raw) {
    if (ln.startsWith(" ") || ln.startsWith("\t")) {
      if (out.length) out[out.length - 1] += ln.slice(1);
    } else out.push(ln);
  }
  return out;
}

function parseDt(val: string): number | null {
  // Accept: 20260527T093000Z, 20260527T093000, 20260527
  const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (!hh) {
    const t = new Date(Number(y), Number(mo) - 1, Number(d));
    return t.getTime();
  }
  if (z) {
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0));
  }
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0)).getTime();
}

function unescapeText(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export type ParsedEvent = {
  uid?: string;
  title: string;
  description?: string;
  start: number;
  end: number;
};

export function parseICS(text: string): ParsedEvent[] {
  const lines = unfold(text);
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> & { _open?: boolean } | null = null;

  for (const ln of lines) {
    if (ln === "BEGIN:VEVENT") { cur = { _open: true }; continue; }
    if (ln === "END:VEVENT") {
      if (cur && cur.title && cur.start) {
        events.push({
          uid: cur.uid,
          title: cur.title,
          description: cur.description,
          start: cur.start,
          end: cur.end || cur.start + 60 * 60 * 1000,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = ln.indexOf(":");
    if (colon < 0) continue;
    const left = ln.slice(0, colon);
    const value = ln.slice(colon + 1);
    const [name] = left.split(";");
    if (name === "SUMMARY") cur.title = unescapeText(value);
    else if (name === "DESCRIPTION") cur.description = unescapeText(value);
    else if (name === "DTSTART") cur.start = parseDt(value) ?? undefined;
    else if (name === "DTEND")   cur.end   = parseDt(value) ?? undefined;
    else if (name === "UID")     cur.uid   = value;
  }
  return events;
}

export async function importICSText(text: string): Promise<{ added: number; skipped: number }> {
  const parsed = parseICS(text);
  let added = 0, skipped = 0;
  const all = await db().events.where("userId").equals(LOCAL_USER_ID).toArray();
  const byExtId = new Map(all.filter(x => x.externalId).map(x => [x.externalId!, x]));
  for (const e of parsed) {
    if (e.uid && byExtId.has(e.uid)) { skipped++; continue; }
    await db().events.add({
      id: uid(),
      userId: LOCAL_USER_ID,
      source: "ics",
      externalId: e.uid,
      title: e.title,
      sub: e.description?.slice(0, 200),
      start: e.start,
      end: e.end,
      attendees: [],
      createdAt: Date.now(),
    });
    added++;
  }
  return { added, skipped };
}
