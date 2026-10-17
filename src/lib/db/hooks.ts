"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getActorId, isSampleActor, subscribeActor, uid, TaskRow, NoteRow, HabitRow, HabitLogRow, EventRow, CaptureRow, AreaRow } from "./schema";
import { localDateKey } from "../date";

export function useActorId() {
  const [id, setId] = useState(getActorId);
  useEffect(() => subscribeActor(setId), []);
  return id;
}

export type SyncOp = "upsert" | "delete";

export async function enqueue(table: string, recordId: string, op: SyncOp, payload: any) {
  if (isSampleActor()) return;
  await db().syncQueue.add({
    id: uid(),
    table,
    recordId,
    op: op === "upsert" ? "update" : "delete",
    payload,
    attempts: 0,
    createdAt: Date.now(),
  });
}

export function useTasks(filter?: { done?: boolean; section?: string; focus?: boolean }) {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    let coll = db().tasks.where("userId").equals(actorId);
    let rows = await coll.toArray();
    if (filter?.done !== undefined) rows = rows.filter(r => r.done === filter.done);
    if (filter?.section) rows = rows.filter(r => r.section === filter.section);
    if (filter?.focus !== undefined) rows = rows.filter(r => r.focus === filter.focus);
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  }, [actorId, filter?.done, filter?.section, filter?.focus]);
}

export function useTaskCounts() {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    const all = await db().tasks.where("userId").equals(actorId).toArray();
    return {
      total: all.length,
      open: all.filter(t => !t.done).length,
      done: all.filter(t => t.done).length,
      today: all.filter(t => t.section === "today").length,
    };
  }, [actorId]);
}

export function useNotes(tag?: string) {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    let rows = await db().notes.where("userId").equals(actorId).toArray();
    if (tag && tag !== "all") rows = rows.filter(r => r.tag === tag);
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [actorId, tag]);
}

export function useHabits() {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    const habits = await db().habits.where("userId").equals(actorId).toArray();
    const logsByHabit: Record<string, HabitLogRow[]> = {};
    for (const h of habits) {
      logsByHabit[h.id] = (await db().habitLogs.where("habitId").equals(h.id).toArray())
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    return { habits, logsByHabit };
  }, [actorId]);
}

export function useStreak() {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    const habits = await db().habits.where("userId").equals(actorId).toArray();
    if (habits.length === 0) return 0;
    const habitIds = new Set(habits.map(h => h.id));
    const logs = (await db().habitLogs.toArray()).filter(l => habitIds.has(l.habitId));
    const byDate: Record<string, Record<string, number>> = {};
    for (const l of logs) {
      byDate[l.date] = byDate[l.date] || {};
      byDate[l.date][l.habitId] = l.value;
    }
    // walk back from today; a "kept" day = any habit logged >0 that day.
    // Key by LOCAL day (see lib/date.ts) so the streak matches the wall clock.
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = localDateKey(d);
      const day = byDate[key] || {};
      const ok = Object.values(day).some(v => v > 0);
      if (ok) streak++; else break;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [actorId]);
}

export function useAreas() {
  const actorId = useActorId();
  return useLiveQuery(async () =>
    db().areas.where("userId").equals(actorId).toArray()
  , [actorId]);
}

export function useAgentRuns() {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    const rows = await db().agentRuns.where("userId").equals(actorId).toArray();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }, [actorId]);
}

export function useMCPCatalog() {
  return useLiveQuery(async () => db().mcpCatalog.toArray(), []);
}

export function useEventsRange(startMs: number, endMs: number) {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    const rows = await db().events
      .where("start").between(startMs, endMs, true, true)
      .toArray();
    return rows.filter(r => r.userId === actorId).sort((a, b) => a.start - b.start);
  }, [actorId, startMs, endMs]);
}

export function useTodayEvents() {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date();   end.setHours(23, 59, 59, 999);
    const rows = await db().events
      .where("start").between(start.getTime(), end.getTime(), true, true)
      .toArray();
    return rows.filter(r => r.userId === actorId).sort((a, b) => a.start - b.start);
  }, [actorId]);
}

export function useInboxCaptures() {
  const actorId = useActorId();
  return useLiveQuery(async () => {
    const rows = await db().captures.where("userId").equals(actorId).toArray();
    return rows.filter(r => !r.processed).sort((a, b) => b.createdAt - a.createdAt);
  }, [actorId]);
}

export function useTweak<T = any>(key: string, fallback: T): T {
  const v = useLiveQuery(async () => (await db().settings.get(key))?.value, [key]);
  return (v as T) ?? fallback;
}

// ── mutations (also enqueue for Supabase outbox) ──
export async function toggleTask(id: string) {
  const t = await db().tasks.get(id);
  if (!t) return;
  const patch = { done: !t.done, updatedAt: Date.now(), syncState: "pending" as const };
  await db().tasks.update(id, patch);
  await enqueue("tasks", id, "upsert", { ...t, ...patch });
}

export async function updateTask(id: string, patch: Partial<Pick<TaskRow, "text" | "section" | "due" | "focus" | "chipCls" | "chipLabel" | "urgent">>) {
  const existing = await db().tasks.get(id);
  if (!existing) return;
  const next = { ...existing, ...patch, updatedAt: Date.now(), syncState: "pending" as const };
  await db().tasks.update(id, next);
  await enqueue("tasks", id, "upsert", next);
}

export async function deleteTask(id: string) {
  await db().tasks.delete(id);
  await enqueue("tasks", id, "delete", { id });
}

export async function addTask(text: string, section: string = "today", chipCls?: string, chipLabel?: string) {
  const row: TaskRow = {
    id: uid(),
    userId: getActorId(),
    text,
    chipCls,
    chipLabel,
    focus: false,
    done: false,
    section,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncState: "pending",
  };
  await db().tasks.add(row);
  await enqueue("tasks", row.id, "upsert", row);
}

export async function addNote(title: string, body: string, tag?: string) {
  const row: NoteRow = {
    id: uid(),
    userId: getActorId(),
    title,
    body,
    tag,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncState: "pending",
  };
  await db().notes.add(row);
  await enqueue("notes", row.id, "upsert", row);
}

export async function updateNote(id: string, patch: { title?: string; body?: string; tag?: string; pinned?: boolean }) {
  const existing = await db().notes.get(id);
  if (!existing) return;
  const next = { ...existing, ...patch, updatedAt: Date.now(), syncState: "pending" as const };
  await db().notes.update(id, next);
  await enqueue("notes", id, "upsert", next);
}

export async function deleteNote(id: string) {
  await db().notes.delete(id);
  await enqueue("notes", id, "delete", { id });
}

export async function addCapture(body: string, kind: CaptureRow["kind"] = "text", tags: string[] = []) {
  const row: CaptureRow = {
    id: uid(),
    userId: getActorId(),
    kind,
    body,
    tags,
    processed: false,
    createdAt: Date.now(),
  };
  await db().captures.add(row);
  await enqueue("captures", row.id, "upsert", row);
}

export async function setTweak(key: string, value: any) {
  await db().settings.put({ key, value });
}

export async function logHabitCell(habitId: string, date: string, value: 0 | 1 | 2 | 3) {
  const existing = (await db().habitLogs.where("[habitId+date]").equals([habitId, date]).first()) as HabitLogRow | undefined;
  if (existing) {
    await db().habitLogs.update(existing.id, { value });
    await enqueue("habitLogs", existing.id, "upsert", { ...existing, value });
  } else {
    const row: HabitLogRow = { id: uid(), habitId, date, value };
    await db().habitLogs.add(row);
    await enqueue("habitLogs", row.id, "upsert", row);
  }
}
