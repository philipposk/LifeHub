"use client";
import { db, uid, LOCAL_USER_ID } from "../db/schema";
import { getSupabase } from "../sync/supabase";

type CosmoConfig = { baseUrl?: string; apiKey?: string };

export async function getCosmoConfig(): Promise<CosmoConfig | null> {
  const cfg = (await db().settings.get("cosmo"))?.value as CosmoConfig | undefined;
  if (!cfg?.baseUrl) return null;
  return cfg;
}

export async function setCosmoConfig(baseUrl: string, apiKey?: string) {
  await db().settings.put({ key: "cosmo", value: { baseUrl: baseUrl.replace(/\/$/, ""), apiKey } });
}

async function cosmoFetch(path: string) {
  const cfg = await getCosmoConfig();
  if (!cfg) throw new Error("Cosmo not configured");
  const headers: Record<string, string> = {};
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
  const r = await fetch(cfg.baseUrl + path, { headers });
  if (!r.ok) throw new Error(`Cosmo ${path} → ${r.status}`);
  return r.json();
}

export async function tryLinkByEmail(): Promise<
  | { linked: true; email: string; cosmoUserId: string }
  | { linked: false; reason: string }
> {
  const supa = await getSupabase();
  if (!supa) return { linked: false, reason: "no-supabase" };
  const { data } = await supa.auth.getUser();
  const email = data?.user?.email;
  if (!email) return { linked: false, reason: "no-supabase-session" };

  const profiles = await db().cosmoProfiles.toArray();
  const match = profiles.find(p => (p.email || "").toLowerCase() === email.toLowerCase());
  if (!match) return { linked: false, reason: `no-cosmo-profile-for-${email}` };

  await db().users.put({
    id: LOCAL_USER_ID,
    name: match.name || "You",
    email,
    cosmoLinked: true,
    createdAt: Date.now(),
  });
  return { linked: true, email, cosmoUserId: match.externalId };
}

export async function syncCosmoProfile(externalUserId: string): Promise<boolean> {
  try {
    const profile = await cosmoFetch(`/api/users/${encodeURIComponent(externalUserId)}`).catch(() => null);
    if (!profile) return false;
    await db().cosmoProfiles.put({
      id: uid(),
      userId: LOCAL_USER_ID,
      externalId: externalUserId,
      name: profile.name || profile.username,
      email: profile.email,
      raw: profile,
      fetchedAt: Date.now(),
    });

    const contentList = await cosmoFetch(`/api/users/${encodeURIComponent(externalUserId)}/content`).catch(() => []);
    if (Array.isArray(contentList)) {
      for (const c of contentList.slice(0, 20)) {
        await db().cosmoContent.put({
          id: uid(),
          userId: LOCAL_USER_ID,
          externalId: String(c.id ?? c._id ?? uid()),
          title: c.title,
          body: c.body || c.text,
          url: c.url,
          createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
          fetchedAt: Date.now(),
        });
      }
    }
    return true;
  } catch (err) {
    console.warn("[lifehub] cosmo sync failed", err);
    return false;
  }
}
