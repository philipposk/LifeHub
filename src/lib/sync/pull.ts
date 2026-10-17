"use client";
import { db, SAMPLE_USER_ID } from "../db/schema";
import { getSupabase } from "./supabase";

const TABLE_NAMES = [
  "tasks",
  "notes",
  "habits",
  "habitLogs",
  "events",
  "captures",
  "tags",
  "areas",
  "agentRuns",
  "cosmoProfiles",
  "cosmoContent",
  "emailAccounts",
  "emails",
] as const;

export async function pullActorRecords(userId: string) {
  if (!userId || userId === SAMPLE_USER_ID) return;
  const client = await getSupabase();
  if (!client) return;
  const { data, error } = await client
    .from("lifehub_records")
    .select("id, table_name, payload")
    .eq("user_id", userId);
  if (error || !data) return;

  const database = db() as unknown as Record<string, { put: (row: unknown) => Promise<unknown> }>;
  for (const row of data) {
    if (!TABLE_NAMES.includes(row.table_name as (typeof TABLE_NAMES)[number])) continue;
    const payload = row.payload as Record<string, unknown> | null;
    if (!payload) continue;
    const store = database[row.table_name];
    if (!store?.put) continue;
    await store.put({ ...payload, id: row.id, userId, syncState: "synced" });
  }
}
