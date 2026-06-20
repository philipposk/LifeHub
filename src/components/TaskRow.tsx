"use client";
import { useEffect, useRef, useState } from "react";
import { TaskRow as TaskModel } from "@/lib/db/schema";
import { toggleTask, updateTask, deleteTask } from "@/lib/db/hooks";
import { useToast } from "./Toast";
import { IconCheck } from "./icons";

const SECTIONS: { key: string; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "next-week", label: "Next week" },
  { key: "someday", label: "Someday" },
];

export function TaskRow({ t }: { t: TaskModel }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(t.text);
  const [menu, setMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const saveText = async () => {
    const v = text.trim();
    setEditing(false);
    if (v && v !== t.text) { await updateTask(t.id, { text: v }); }
    else setText(t.text);
  };

  const move = async (section: string) => {
    setMenu(false);
    await updateTask(t.id, { section });
    toast.success("Moved to " + (SECTIONS.find(s => s.key === section)?.label || section));
  };
  const toggleFocus = async () => { setMenu(false); await updateTask(t.id, { focus: !t.focus }); };
  const remove = async () => { setMenu(false); await deleteTask(t.id); toast.toast("Task deleted"); };

  return (
    <div className={"task" + (t.done ? " done" : "")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={t.done}
        aria-label={(t.done ? "Mark incomplete: " : "Mark complete: ") + t.text}
        className={"check" + (t.done ? " done" : "")}
        onClick={() => toggleTask(t.id)}
      >
        <IconCheck />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="task-edit"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={saveText}
          onKeyDown={e => {
            if (e.key === "Enter") saveText();
            else if (e.key === "Escape") { setText(t.text); setEditing(false); }
          }}
        />
      ) : (
        <div
          className="task-text"
          onDoubleClick={() => { setText(t.text); setEditing(true); }}
          title="Double-click to rename"
        >
          {t.text}
        </div>
      )}

      <div className="task-meta">
        {t.focus && <span className="chip focus" title="Focus">★</span>}
        {t.chipLabel && <span className={"chip " + (t.chipCls || "")}>{t.chipLabel}</span>}
        {t.due && <span className={t.urgent ? "due-soon" : ""}>{t.due}</span>}
        <div className="task-actions" ref={menuRef}>
          <button type="button" className="task-menu-btn" aria-label="Task actions" onClick={() => setMenu(m => !m)}>⋯</button>
          {menu && (
            <div className="task-menu">
              <button onClick={() => { setMenu(false); setText(t.text); setEditing(true); }}>Rename</button>
              <button onClick={toggleFocus}>{t.focus ? "Unfocus" : "Mark focus"}</button>
              <div className="task-menu-label">Move to</div>
              {SECTIONS.filter(s => s.key !== (t.section || "today")).map(s => (
                <button key={s.key} onClick={() => move(s.key)}>{s.label}</button>
              ))}
              <button className="danger" onClick={remove}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
