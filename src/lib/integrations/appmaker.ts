"use client";
import { db } from "../db/schema";

type AppMakerConfig = { baseUrl?: string; apiKey?: string };

export async function getAppMakerConfig(): Promise<AppMakerConfig | null> {
  const cfg = (await db().settings.get("appmaker"))?.value as AppMakerConfig | undefined;
  if (!cfg?.baseUrl) return null;
  return cfg;
}

export async function setAppMakerConfig(baseUrl: string, apiKey?: string) {
  await db().settings.put({ key: "appmaker", value: { baseUrl: baseUrl.replace(/\/$/, ""), apiKey } });
}

export async function createAppMakerApp(prompt: string): Promise<{ id?: string; url?: string } | null> {
  const cfg = await getAppMakerConfig();
  if (!cfg) return null;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
    const r = await fetch(cfg.baseUrl + "/api/apps", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return {
      id: j.id || j.appId,
      url: j.previewUrl || j.url || `${cfg.baseUrl}/apps/${j.id || j.appId || ""}`,
    };
  } catch (err) {
    console.warn("[lifehub] createAppMakerApp failed", err);
    return null;
  }
}

export async function listAppMakerApps(): Promise<any[] | null> {
  const cfg = await getAppMakerConfig();
  if (!cfg) return null;
  try {
    const headers: Record<string, string> = {};
    if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
    const r = await fetch(cfg.baseUrl + "/api/apps", { headers });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
