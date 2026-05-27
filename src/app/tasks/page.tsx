"use client";
import { useState } from "react";
import { useTasks, useTaskCounts, addTask } from "@/lib/db/hooks";
import { TaskRow } from "@/components/TaskRow";
import { IconPlus } from "@/components/icons";

type Filter = "all" | "today" | "open" | "done";

const SECTIONS: { key: string; label: string }[] = [
  { key: "today",     label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "next-week", label: "Next week" },
  { key: "someday",   label: "Someday" },
];

export default function TasksPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useTaskCounts();
  const all = useTasks() || [];

  const filterFn = (arr: typeof all) => {
    if (filter === "all" || filter === "today") return arr;
    if (filter === "open") return arr.filter(t => !t.done);
    return arr.filter(t => t.done);
  };

  const [newText, setNewText] = useState<Record<string, string>>({});
  const addInSection = async (section: string) => {
    const t = (newText[section] || "").trim();
    if (!t) return;
    await addTask(t, section);
    setNewText({ ...newText, [section]: "" });
  };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Tasks</div>
          <div className="view-sub">
            {counts ? `${counts.open} open · ${counts.done} done` : "…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="filter-bar">
            {(["all", "today", "open", "done"] as Filter[]).map(k => (
              <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {all.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No tasks yet. Add one below or capture from <span className="kbd">/today</span>.
        </div>
      )}

      {SECTIONS.map(s => {
        const items = filterFn(all.filter(t => (t.section || "today") === s.key));
        if (all.length > 0 && items.length === 0 && filter !== "all") return null;
        return (
          <div className="task-section" key={s.key}>
            <div className="task-section-hd">
              <div className="ttl">{s.label}</div>
              <div className="cnt">{items.length} items</div>
            </div>
            {items.map(t => <TaskRow key={t.id} t={t} />)}
            <div className="add-task">
              <div className="plus"><IconPlus /></div>
              <input
                placeholder="Add a task…"
                value={newText[s.key] || ""}
                onChange={e => setNewText({ ...newText, [s.key]: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") addInSection(s.key); }}
              />
              <span className="kbd">⏎</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
