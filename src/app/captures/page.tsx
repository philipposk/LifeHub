"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_USER_ID, CaptureRow } from "@/lib/db/schema";
import { addTask, addNote } from "@/lib/db/hooks";

function useBlobURL(ref?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) { setUrl(null); return; }
    let revoked = false;
    let made: string | null = null;
    (async () => {
      const row = await db().blobs.get(ref);
      if (!row || revoked) return;
      made = URL.createObjectURL(row.blob);
      setUrl(made);
    })();
    return () => {
      revoked = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [ref]);
  return url;
}

function CaptureCard({ c }: { c: CaptureRow }) {
  const url = useBlobURL(c.blobRef);

  const promoteToTask = async () => {
    await addTask(c.body || c.ocrText || c.transcript || c.kind, "today");
    await db().captures.update(c.id, { processed: true });
  };
  const promoteToNote = async () => {
    const text = c.ocrText || c.transcript || c.body || "";
    const title = text.split("\n")[0].slice(0, 80) || c.kind;
    await addNote(title, text);
    await db().captures.update(c.id, { processed: true });
  };
  const togglProcessed = async () => {
    await db().captures.update(c.id, { processed: !c.processed });
  };
  const remove = async () => {
    if (c.blobRef) await db().blobs.delete(c.blobRef);
    await db().captures.delete(c.id);
  };

  return (
    <div className="card cap-tile">
      <div>
        {c.kind === "photo" && url && <img src={url} alt="" className="thumb" />}
        {c.kind === "voice" && (url
          ? <audio src={url} controls preload="metadata" />
          : <div className="thumb" style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>voice</div>
        )}
        {(c.kind !== "photo" && c.kind !== "voice") && (
          <div className="thumb" style={{ display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.08 }}>{c.kind}</div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{c.body || "(no body)"}</div>
        {c.ocrText && c.ocrText !== c.body && (
          <details style={{ marginTop: 6 }}>
            <summary style={{ fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>OCR text ({c.ocrText.length} chars)</summary>
            <pre style={{ fontSize: 11, color: "var(--ink-2)", whiteSpace: "pre-wrap", marginTop: 6, padding: 8, background: "var(--bg-2)", borderRadius: 6, maxHeight: 240, overflow: "auto" }}>{c.ocrText}</pre>
          </details>
        )}
        {c.transcript && c.transcript !== c.body && (
          <details style={{ marginTop: 6 }}>
            <summary style={{ fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>Transcript</summary>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6, padding: 8, background: "var(--bg-2)", borderRadius: 6 }}>{c.transcript}</div>
          </details>
        )}
        <div className="meta" style={{ marginTop: 8 }}>
          {new Date(c.createdAt).toLocaleString()}
          {c.tags.length > 0 && " · " + c.tags.map(t => "#" + t).join(" ")}
          {c.processed && " · processed"}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="tool-btn" onClick={promoteToTask}>→ Task</button>
        <button className="tool-btn" onClick={promoteToNote}>→ Note</button>
        <button className="tool-btn" onClick={togglProcessed}>{c.processed ? "Unmark" : "Mark done"}</button>
        <button className="tool-btn" onClick={remove}>Delete</button>
      </div>
    </div>
  );
}

export default function CapturesPage() {
  const all = useLiveQuery(async () => {
    const rows = await db().captures.where("userId").equals(LOCAL_USER_ID).toArray();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }, []) || [];
  const [filter, setFilter] = useState<"all" | "photo" | "voice" | "text" | "link">("all");
  const shown = filter === "all" ? all : all.filter(c => c.kind === filter);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Captures</div>
          <div className="view-sub">{all.length} total · {all.filter(c => !c.processed).length} pending</div>
        </div>
        <div className="filter-bar">
          {(["all", "photo", "voice", "text", "link"] as const).map(k => (
            <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          {filter === "all" ? "No captures yet." : `No ${filter} captures.`}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map(c => <CaptureCard key={c.id} c={c} />)}
      </div>
    </>
  );
}
