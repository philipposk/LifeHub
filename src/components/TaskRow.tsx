"use client";
import { TaskRow as TaskModel } from "@/lib/db/schema";
import { toggleTask } from "@/lib/db/hooks";
import { IconCheck } from "./icons";

export function TaskRow({ t }: { t: TaskModel }) {
  return (
    <div className={"task" + (t.done ? " done" : "")}>
      <div className={"check" + (t.done ? " done" : "")} onClick={() => toggleTask(t.id)}>
        <IconCheck />
      </div>
      <div className="task-text">{t.text}</div>
      <div className="task-meta">
        {t.chipLabel && <span className={"chip " + (t.chipCls || "")}>{t.chipLabel}</span>}
        {t.due && <span className={t.urgent ? "due-soon" : ""}>{t.due}</span>}
      </div>
    </div>
  );
}
