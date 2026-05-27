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
    const rows = upserts.map(u => ({
      id: u.recordId,
      user_id: u.payload?.userId ?? "local-guest",
      table_name: u.table,
      payload: u.payload,
      updated_at: new Date(u.createdAt).toISOString(),
    }));
    const { error } = await client.from(TABLE).upsert(rows, { onConflict: "id" });
    if (error) {
      lastError = error.message;
      // bump attempts
      for (const u of upserts) {
        const next = u.attempts + 1;
        if (next >= MAX_ATTEMPTS) {
          await db().syncQueue.delete(u.id);
        } else {
          await db().syncQueue.update(u.id, { attempts: next });
        }
      }
    } else {
      for (const u of upserts) await db().syncQueue.delete(u.id);
      flushed += upserts.length;
    }
  }

  for (const d of deletes) {
    const { error } = await client.from(TABLE).delete().eq("id", d.recordId);
    if (error) {
      lastError = error.message;
      const next = d.attempts + 1;
      if (next >= MAX_ATTEMPTS) await db().syncQueue.delete(d.id);
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
