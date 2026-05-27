"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_USER_ID } from "@/lib/db/schema";

export default function TagsPage() {
  const notes = useLiveQuery(async () => db().notes.where("userId").equals(LOCAL_USER_ID).toArray(), []) || [];
  const captures = useLiveQuery(async () => db().captures.where("userId").equals(LOCAL_USER_ID).toArray(), []) || [];
  const counts: Record<string, number> = {};
  for (const n of notes) if (n.tag) counts[n.tag] = (counts[n.tag] || 0) + 1;
  for (const c of captures) for (const t of c.tags) counts[t] = (counts[t] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Tags</div>
          <div className="view-sub">{sorted.length} unique</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {sorted.map(([t, n]) => (
          <span key={t} className="chip focus" style={{ fontSize: 12, padding: "4px 10px" }}>
            #{t} <span style={{ marginLeft: 4, color: "var(--muted)" }}>{n}</span>
          </span>
        ))}
        {sorted.length === 0 && <div style={{ color: "var(--muted)" }}>No tags yet. Use #hashtags in captures.</div>}
      </div>
    </>
  );
}
