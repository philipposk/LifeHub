"use client";
import { useEffect, useState } from "react";
import { NoteRow } from "@/lib/db/schema";
import { addNote, updateNote, deleteNote } from "@/lib/db/hooks";

export type NoteDraft = Partial<NoteRow> & { id?: string };

export function NoteEditor({ note, onClose }: { note: NoteDraft | null; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(note?.title || "");
    setBody(note?.body || "");
    setTag(note?.tag || "");
    setPinned(!!note?.pinned);
  }, [note?.id, note?.title, note?.body, note?.tag, note?.pinned]);

  if (!note) return null;
  const isEdit = !!note.id;

  const save = async () => {
    if (!title.trim() && !body.trim()) { onClose(); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateNote(note.id!, { title: title.trim() || "Untitled", body, tag: tag.trim() || undefined, pinned });
      } else {
        // addNote doesn't take pin; set it immediately after if needed
        await addNote(title.trim() || "Untitled", body, tag.trim() || undefined);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!note.id) { onClose(); return; }
    if (!confirm("Delete this note?")) return;
    await deleteNote(note.id);
    onClose();
  };

  return (
    <div className="cp-backdrop" onClick={onClose}>
      <div className="note-editor" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          className="ne-title"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="ne-body"
          placeholder="Write your note… (markdown ok)"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save(); }}
        />
        <div className="ne-foot">
          <input
            className="ne-tag"
            placeholder="#tag"
            value={tag}
            onChange={e => setTag(e.target.value.replace(/^#/, ""))}
          />
          <label className="ne-pin">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            Pinned
          </label>
          <div style={{ flex: 1 }} />
          {isEdit && <button className="tool-btn" onClick={remove}>Delete</button>}
          <button className="tool-btn" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"} <span className="kbd">⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
