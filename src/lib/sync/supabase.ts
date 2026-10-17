"use client";
import { createClient as createJsClient, SupabaseClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/client";
import { db } from "../db/schema";

let _client: SupabaseClient | null = null;
let _key: string | null = null;

export async function getSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    if (_client && _key === "env") return _client;
    _key = "env";
    _client = createCookieClient() as unknown as SupabaseClient;
    return _client;
  }

  const cfg = (await db().settings.get("supabase"))?.value as { url?: string; anonKey?: string } | undefined;
  if (!cfg?.url || !cfg?.anonKey) return null;
  const fingerprint = cfg.url + "|" + cfg.anonKey;
  if (_client && _key === fingerprint) return _client;
  _key = fingerprint;
  _client = createJsClient(cfg.url, cfg.anonKey, { auth: { persistSession: true } });
  return _client;
}

export async function setSupabaseConfig(url: string, anonKey: string) {
  await db().settings.put({ key: "supabase", value: { url, anonKey } });
  _client = null;
}

export async function clearSupabaseConfig() {
  await db().settings.delete("supabase");
  _client = null;
}
