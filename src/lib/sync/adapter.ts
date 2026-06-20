"use client";
import { db, SyncQueueRow } from "../db/schema";
import { getSupabase } from "./supabase";

const TABLE = "lifehub_records";

export type FlushResult =
  | { skipped: true; reason: string }
  | { ok: true; flushed: number; remaining: number; lastError?: string };

const MAX_PER_TICK = 50;
const MAX_ATTEMPTS = 5;

async function recordLastFlush(result: FlushResult) {
  await db().settings.put({ key: "syncStatus", value: { ...result, at: Date.now() } });
}

// Rows that fail MAX_ATTEMPTS times are parked here (capped) instead of being
// dropped silently, so they're recoverable/inspectable from Settings.
async function deadLetter(row: SyncQueueRow, error: string) {
  const cur = ((await db().settings.get("syncDeadLetter"))?.value as any[]) || [];
  cur.push({ table: row.table, recordId: row.recordId, payload: row.payload, error, at: Date.now() });
  await db().settings.put({ key: "syncDeadLetter", value: cur.slice(-100) });
}

export async function flushSyncQueue(): Promise<FlushResult> {
  const client = await getSupabase();
  if (!client) {
    const r: FlushResult = { skipped: true, reason: "no-supabase-config" };
    await recordLastFlush(r);
    return r;
  }

  const pending = await db().syncQueue.orderBy("createdAt").limit(MAX_PER_TICK).toArray();
  if (pending.length === 0) {
    const r: FlushResult = { ok: true, flushed: 0, remaining: 0 };
    await recordLastFlush(r);
    return r;
  }

  let flushed = 0;
  let lastError: string | undefined;

  // Group upserts; deletes go one-by-one (rare).
  const upserts: SyncQueueRow[] = [];
  const deletes: SyncQueueRow[] = [];
  for (const row of pending) {
    if (row.op === "delete") deletes.push(row); else upserts.push(row);
  }

  if (upserts.length > 0) {
    // Dedup by recordId. Editing the same task 5x enqueues 5 rows with the same
    // recordId; sending them all in one upsert makes Postgres reject the whole
    // batch ("ON CONFLICT cannot affect row a second time"), so it never flushed
    // and was eventually dropped. Keep only the LATEST payload per recordId and
    // delete the superseded queue rows alongside it.
    const winnerByRecord = new Map<string, SyncQueueRow>();
    const queueIdsByRecord = new Map<string, string[]>();
    for (const u of upserts) {
      const ids = queueIdsByRecord.get(u.recordId) || [];
      ids.push(u.id);
      queueIdsByRecord.set(u.recordId, ids);
      const cur = winnerByRecord.get(u.recordId);
      if (!cur || u.createdAt >= cur.createdAt) winnerByRecord.set(u.recordId, u);
    }

    const winners = Array.from(winnerByRecord.values());
    const rows = winners.map(u => ({
      id: u.recordId,
      user_id: u.payload?.userId ?? "local-guest",
      table_name: u.table,
      payload: u.payload,
      updated_at: new Date(u.createdAt).toISOString(),
    }));
    const { error } = await client.from(TABLE).upsert(rows, { onConflict: "id" });
    if (error) {
      lastError = error.message;
      // bump attempts on the winner row only (it represents the record); drop to
      // a dead-letter after MAX_ATTEMPTS instead of losing data silently.
      for (const u of winners) {
        const next = u.attempts + 1;
        if (next >= MAX_ATTEMPTS) {
          await deadLetter(u, error.message);
          for (const id of queueIdsByRecord.get(u.recordId) || []) await db().syncQueue.delete(id);
        } else {
          await db().syncQueue.update(u.id, { attempts: next });
        }
      }
    } else {
      // success → clear every queue row for each flushed record (winner + superseded)
      for (const ids of queueIdsByRecord.values()) {
        for (const id of ids) await db().syncQueue.delete(id);
      }
      flushed += winners.length;
    }
  }

  for (const d of deletes) {
    const { error } = await client.from(TABLE).delete().eq("id", d.recordId);
    if (error) {
      lastError = error.message;
      const next = d.attempts + 1;
      if (next >= MAX_ATTEMPTS) { await deadLetter(d, error.message); await db().syncQueue.delete(d.id); }
      else await db().syncQueue.update(d.id, { attempts: next });
    } else {
      await db().syncQueue.delete(d.id);
      flushed++;
    }
  }

  const remaining = await db().syncQueue.count();
  const r: FlushResult = { ok: true, flushed, remaining, lastError };
  await recordLastFlush(r);
  return r;
}

let _started = false;
export function startSyncLoop(intervalMs = 15_000) {
  if (typeof window === "undefined" || _started) return;
  _started = true;
  const tick = () => {
    flushSyncQueue().catch(err => console.warn("[lifehub] flush err", err));
  };
  tick();
  setInterval(tick, intervalMs);
  window.addEventListener("online", tick);
}
