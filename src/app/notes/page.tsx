"use client";
import { useState } from "react";
import { useNotes } from "@/lib/db/hooks";
import { NoteEditor, NoteDraft } from "@/components/NoteEditor";
import { NoteRow } from "@/lib/db/schema";
import { IconFilter, IconPlus } from "@/components/icons";

type SortMode = "recent" | "pinned" | "alpha";

export default function NotesPage() {
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [editing, setEditing] = useState<NoteDraft | null>(null);
  const notes = useNotes() || [];

  const filtered = (tag === "all" ? notes : notes.filter(n => n.tag === tag)).slice();
  filtered.sort((a, b) => {
    if (sort === "pinned") return Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt;
    if (sort === "alpha")  return (a.title || "").localeCompare(b.title || "");
    return b.updatedAt - a.updatedAt;
  });

  const tags = ["all", ...Array.from(new Set(notes.map(n => n.tag).filter(Boolean) as string[]))];
  const cycleSort = () => setSort(s => (s === "recent" ? "pinned" : s === "pinned" ? "alpha" : "recent"));
  const sortLabel = sort === "recent" ? "recent" : sort === "pinned" ? "pinned" : "A–Z";

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Notes</div>
          <div className="view-sub">{notes.length} notes · {notes.filter(n => n.pinned).length} pinned</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="tool-btn" onClick={cycleSort}><IconFilter /> Sort: {sortLabel}</button>
          <button className="btn-primary" onClick={() => setEditing({})}><IconPlus /> New note</button>
        </div>
      </div>

      <div className="filter-bar" style={{ display: "inline-flex", marginBottom: 22, flexWrap: "wrap" }}>
        {tags.map(t => (
          <button key={t} className={tag === t ? "on" : ""} onClick={() => setTag(t)}>
            {t === "all" ? "All" : "#" + t}
          </button>
        ))}
      </div>

      {notes.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          No notes yet. Click <b>New note</b> or capture <span className="kbd">note: …</span> from Today.
        </div>
      )}

      <div className="notes-grid">
        {filtered.map((n: NoteRow) => (
          <button
            key={n.id}
            type="button"
            className={"note-tile" + (n.pinned ? " pinned" : "")}
            style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}
            onClick={() => setEditing(n)}
            aria-label={`Edit note: ${n.title}`}
          >
            <h4 className={n.serif ? "serif" : ""}>{n.title}</h4>
            <div className="body">{n.body}</div>
            <div className="foot">
              {n.pinned && <span className="pin">Pinned</span>}
              {n.tag && <span>#{n.tag}</span>}
              <span>·</span>
              <span>{n.time || new Date(n.updatedAt).toLocaleDateString()}</span>
            </div>
          </button>
        ))}
      </div>

      <NoteEditor note={editing} onClose={() => setEditing(null)} />
    </>
  );
}
