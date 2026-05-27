"use client";
import { useState } from "react";
import { useNotes, addNote } from "@/lib/db/hooks";
import { IconFilter, IconPlus } from "@/components/icons";

export default function NotesPage() {
  const [tag, setTag] = useState("all");
  const notes = useNotes() || [];
  const filtered = tag === "all" ? notes : notes.filter(n => n.tag === tag);
  const tags = ["all", ...Array.from(new Set(notes.map(n => n.tag).filter(Boolean) as string[]))];

  const onNew = async () => {
    const title = prompt("Note title");
    if (!title) return;
    const body = prompt("Body (optional)") || "";
    await addNote(title, body);
  };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Notes</div>
          <div className="view-sub">{notes.length} notes · {notes.filter(n => n.pinned).length} pinned</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="tool-btn"><IconFilter /> Sort: recent</button>
          <button className="btn-primary" onClick={onNew}><IconPlus /> New note</button>
        </div>
      </div>

      <div className="filter-bar" style={{ display: "inline-flex", marginBottom: 22 }}>
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
        {filtered.map(n => (
          <div key={n.id} className={"note-tile" + (n.pinned ? " pinned" : "")}>
            <h4 className={n.serif ? "serif" : ""}>{n.title}</h4>
            <div className="body">{n.body}</div>
            <div className="foot">
              {n.pinned && <span className="pin">Pinned</span>}
              {n.tag && <span>#{n.tag}</span>}
              <span>·</span>
              <span>{n.time || new Date(n.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
