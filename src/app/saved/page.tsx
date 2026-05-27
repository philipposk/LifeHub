"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_USER_ID } from "@/lib/db/schema";

export default function SavedPage() {
  const links = useLiveQuery(async () => {
    const rows = await db().captures.where("userId").equals(LOCAL_USER_ID).toArray();
    return rows.filter(r => r.kind === "link").sort((a, b) => b.createdAt - a.createdAt);
  }, []) || [];

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Saved</div>
          <div className="view-sub">{links.length} link{links.length === 1 ? "" : "s"}</div>
        </div>
      </div>

      {links.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          No saved links yet. Paste any URL in Quick capture and it lands here.
        </div>
      )}

      <div className="notes-grid">
        {links.map(l => {
          const url = l.body && /https?:\/\//.test(l.body) ? l.body.match(/https?:\/\/\S+/)?.[0] : undefined;
          return (
            <a
              key={l.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="note-tile"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <h4>{l.body || "(link)"}</h4>
              <div className="body">{url || "no URL parsed"}</div>
              <div className="foot">
                {l.tags.map(t => <span key={t}>#{t}</span>)}
                <span>·</span>
                <span>{new Date(l.createdAt).toLocaleDateString()}</span>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
