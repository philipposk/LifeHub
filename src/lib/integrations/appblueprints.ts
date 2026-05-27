"use client";
import { db, uid } from "../db/schema";

type ABConfig = { dataDir?: string };

export async function getABConfig(): Promise<ABConfig | null> {
  const cfg = (await db().settings.get("appblueprints"))?.value as ABConfig | undefined;
  if (!cfg?.dataDir) return null;
  return cfg;
}

export async function setABConfig(dataDir: string) {
  await db().settings.put({ key: "appblueprints", value: { dataDir } });
}

export type MCPEntry = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  raw: any;
};

export async function fetchMCPCatalog(): Promise<MCPEntry[] | null> {
  const cfg = await getABConfig();
  const url = "/api/integrations/appblueprints" + (cfg?.dataDir ? `?dir=${encodeURIComponent(cfg.dataDir)}` : "");
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    return j.entries as MCPEntry[];
  } catch (err) {
    console.warn("[lifehub] fetchMCPCatalog failed", err);
    return null;
  }
}

export async function refreshMCPCatalog(): Promise<number> {
  const entries = await fetchMCPCatalog();
  if (!entries) return 0;
  await db().mcpCatalog.clear();
  for (const e of entries) {
    await db().mcpCatalog.put({
      id: uid(),
      name: e.name,
      description: e.description,
      category: e.category,
      raw: e.raw,
      fetchedAt: Date.now(),
    });
  }
  return entries.length;
}
