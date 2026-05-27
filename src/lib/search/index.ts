"use client";
import Fuse from "fuse.js";
import { db, LOCAL_USER_ID } from "../db/schema";

export type SearchResult = {
  type: "task" | "note" | "capture";
  id: string;
  label: string;
  sub?: string;
  href: string;
};

export async function searchAll(query: string, limit = 20): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const [tasks, notes, captures] = await Promise.all([
    db().tasks.where("userId").equals(LOCAL_USER_ID).toArray(),
    db().notes.where("userId").equals(LOCAL_USER_ID).toArray(),
    db().captures.where("userId").equals(LOCAL_USER_ID).toArray(),
  ]);

  const items: SearchResult[] = [
    ...tasks.map(t => ({ type: "task" as const, id: t.id, label: t.text, sub: t.chipLabel || t.section, href: "/tasks" })),
    ...notes.map(n => ({ type: "note" as const, id: n.id, label: n.title, sub: n.tag || n.body.slice(0, 60), href: "/notes" })),
    ...captures.map(c => ({ type: "capture" as const, id: c.id, label: c.body || c.kind, sub: c.tags.join(", "), href: "/inbox" })),
  ];

  const fuse = new Fuse(items, {
    keys: ["label", "sub"],
    threshold: 0.4,
    ignoreLocation: true,
  });
  return fuse.search(query, { limit }).map(r => r.item);
}
