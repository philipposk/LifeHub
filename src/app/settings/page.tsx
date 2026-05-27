"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { setSupabaseConfig, clearSupabaseConfig } from "@/lib/sync/supabase";
import { flushSyncQueue } from "@/lib/sync/adapter";
import { setAIOSConfig } from "@/lib/integrations/aios";
import { setAppMakerConfig } from "@/lib/integrations/appmaker";
import { setCosmoConfig } from "@/lib/integrations/cosmo";
import { setABConfig, refreshMCPCatalog } from "@/lib/integrations/appblueprints";
import { importICSText } from "@/lib/calendar/ics";

export default function SettingsPage() {
  const supa = useLiveQuery(async () => (await db().settings.get("supabase"))?.value as { url?: string; anonKey?: string } | undefined, []);
  const tweaks = useLiveQuery(async () => (await db().settings.get("tweaks"))?.value, []);
  const openai = useLiveQuery(async () => (await db().settings.get("openai"))?.value as { key?: string } | undefined, []);
  const aios = useLiveQuery(async () => (await db().settings.get("aios"))?.value as { baseUrl?: string; apiKey?: string } | undefined, []);
  const appmaker = useLiveQuery(async () => (await db().settings.get("appmaker"))?.value as { baseUrl?: string; apiKey?: string } | undefined, []);
  const cosmo = useLiveQuery(async () => (await db().settings.get("cosmo"))?.value as { baseUrl?: string; apiKey?: string } | undefined, []);
  const ab = useLiveQuery(async () => (await db().settings.get("appblueprints"))?.value as { dataDir?: string } | undefined, []);

  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [oaKey, setOaKey] = useState("");
  const [aiosUrl, setAiosUrl] = useState("");
  const [aiosKey, setAiosKey] = useState("");
  const [amUrl, setAmUrl] = useState("");
  const [amKey, setAmKey] = useState("");
  const [cosmoUrl, setCosmoUrl] = useState("");
  const [cosmoKey, setCosmoKey] = useState("");
  const [abDir, setAbDir] = useState("");
  const [icsText, setIcsText] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { if (supa) { setUrl(supa.url || ""); setKey(supa.anonKey || ""); } }, [supa?.url, supa?.anonKey]);
  useEffect(() => { if (openai?.key) setOaKey(openai.key); }, [openai?.key]);
  useEffect(() => { if (aios) { setAiosUrl(aios.baseUrl || ""); setAiosKey(aios.apiKey || ""); } }, [aios?.baseUrl, aios?.apiKey]);
  useEffect(() => { if (appmaker) { setAmUrl(appmaker.baseUrl || ""); setAmKey(appmaker.apiKey || ""); } }, [appmaker?.baseUrl, appmaker?.apiKey]);
  useEffect(() => { if (cosmo) { setCosmoUrl(cosmo.baseUrl || ""); setCosmoKey(cosmo.apiKey || ""); } }, [cosmo?.baseUrl, cosmo?.apiKey]);
  useEffect(() => { if (ab?.dataDir) setAbDir(ab.dataDir); }, [ab?.dataDir]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const saveSupa     = async () => { await setSupabaseConfig(url, key); flash("Supabase saved."); };
  const disconnect   = async () => { await clearSupabaseConfig(); setUrl(""); setKey(""); flash("Disconnected."); };
  const saveOpenAI   = async () => { await db().settings.put({ key: "openai", value: { key: oaKey } }); flash("OpenAI saved."); };
  const saveAIOS     = async () => { await setAIOSConfig(aiosUrl, aiosKey || undefined); flash("AI OS saved."); };
  const saveAppMaker = async () => { await setAppMakerConfig(amUrl, amKey || undefined); flash("AppMaker saved."); };
  const saveCosmo    = async () => { await setCosmoConfig(cosmoUrl, cosmoKey || undefined); flash("Cosmo saved."); };
  const saveAB       = async () => {
    await setABConfig(abDir);
    const n = await refreshMCPCatalog();
    flash(`AppBlueprints saved. Loaded ${n} MCPs.`);
  };
  const importICS = async () => {
    if (!icsText.trim()) return;
    const { added, skipped } = await importICSText(icsText);
    flash(`Imported ${added} events (${skipped} skipped).`);
    setIcsText("");
  };
  const importICSFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const text = await f.text();
    const { added, skipped } = await importICSText(text);
    flash(`Imported ${added} events (${skipped} skipped).`);
  };

  const resetData = async () => {
    if (!confirm("Wipe all local data? This cannot be undone.")) return;
    await db().delete();
    location.reload();
  };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Settings</div>
          <div className="view-sub">Theme, sync, integrations.</div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <label>Accent / dark / density</label>
          <span className="settings-hint">Use the floating Tweaks button (bottom-right) to change these live.</span>
        </div>
        <div className="settings-row">
          <label>Current</label>
          <span className="settings-hint">{tweaks ? `accent ${tweaks.accent} · ${tweaks.dark ? "dark" : "light"} · ${tweaks.density}` : "default"}</span>
        </div>
      </div>

      <div className="settings-section">
        <h3>Sync (optional)</h3>
        <div className="settings-hint" style={{ marginBottom: 12 }}>
          LifeHub works fully offline using IndexedDB. Paste a Supabase URL + anon key for cross-device sync. Run <code>supabase-schema.sql</code> (root of repo) once on your Supabase project first.
        </div>
        <div className="settings-row"><label>Supabase URL</label><input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></div>
        <div className="settings-row"><label>Anon key</label><input type="password" value={key} onChange={e => setKey(e.target.value)} /></div>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <button className="btn-primary" onClick={saveSupa} disabled={!url || !key}>Save</button>
          <button className="tool-btn" onClick={disconnect}>Disconnect</button>
          <button className="tool-btn" onClick={async () => { const r = await flushSyncQueue(); flash(JSON.stringify(r)); }}>Flush now</button>
        </div>
        <SyncStatusRow />
      </div>

      <div className="settings-section">
        <h3>AI (optional)</h3>
        <div className="settings-hint" style={{ marginBottom: 12 }}>
          If set, captures get smarter classification (gpt-4o-mini) and voice memos use Whisper transcription.
        </div>
        <div className="settings-row" style={{ borderTop: "none" }}><label>OpenAI API key</label><input type="password" value={oaKey} onChange={e => setOaKey(e.target.value)} placeholder="sk-..." /></div>
        <div className="settings-row" style={{ borderTop: "none" }}><button className="btn-primary" onClick={saveOpenAI} disabled={!oaKey}>Save</button></div>
      </div>

      <div className="settings-section">
        <h3>Calendar import (.ics)</h3>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <label>ICS file</label>
          <input type="file" accept=".ics,text/calendar" onChange={importICSFile} />
        </div>
        <div className="settings-row">
          <label>Or paste raw ICS</label>
          <textarea rows={4} value={icsText} onChange={e => setIcsText(e.target.value)} style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: 8, color: "var(--ink)", fontFamily: "monospace", fontSize: 11 }} />
        </div>
        <div className="settings-row" style={{ borderTop: "none" }}><button className="btn-primary" onClick={importICS} disabled={!icsText.trim()}>Import paste</button></div>
      </div>

      <div className="settings-section">
        <h3>AI OS</h3>
        <div className="settings-row" style={{ borderTop: "none" }}><label>Base URL</label><input type="text" value={aiosUrl} onChange={e => setAiosUrl(e.target.value)} placeholder="http://localhost:8080" /></div>
        <div className="settings-row"><label>API key</label><input type="password" value={aiosKey} onChange={e => setAiosKey(e.target.value)} /></div>
        <div className="settings-row" style={{ borderTop: "none" }}><button className="btn-primary" onClick={saveAIOS} disabled={!aiosUrl}>Save</button></div>
      </div>

      <div className="settings-section">
        <h3>AppMaker</h3>
        <div className="settings-row" style={{ borderTop: "none" }}><label>Base URL</label><input type="text" value={amUrl} onChange={e => setAmUrl(e.target.value)} placeholder="http://localhost:5000" /></div>
        <div className="settings-row"><label>API key</label><input type="password" value={amKey} onChange={e => setAmKey(e.target.value)} /></div>
        <div className="settings-row" style={{ borderTop: "none" }}><button className="btn-primary" onClick={saveAppMaker} disabled={!amUrl}>Save</button></div>
      </div>

      <div className="settings-section">
        <h3>Cosmo</h3>
        <div className="settings-row" style={{ borderTop: "none" }}><label>Base URL</label><input type="text" value={cosmoUrl} onChange={e => setCosmoUrl(e.target.value)} placeholder="http://localhost:4000" /></div>
        <div className="settings-row"><label>API key</label><input type="password" value={cosmoKey} onChange={e => setCosmoKey(e.target.value)} /></div>
        <div className="settings-row" style={{ borderTop: "none" }}><button className="btn-primary" onClick={saveCosmo} disabled={!cosmoUrl}>Save</button></div>
      </div>

      <div className="settings-section">
        <h3>AppBlueprints (MCP catalog)</h3>
        <div className="settings-row" style={{ borderTop: "none" }}><label>Data dir</label><input type="text" value={abDir} onChange={e => setAbDir(e.target.value)} placeholder="/Users/you/Devoloper Projects/AppBlueprints/data/mcps" /></div>
        <div className="settings-row" style={{ borderTop: "none" }}><button className="btn-primary" onClick={saveAB} disabled={!abDir}>Save + load</button></div>
      </div>

      {msg && <div style={{ position: "fixed", bottom: 20, left: 20, background: "var(--ink)", color: "var(--bg)", padding: "8px 12px", borderRadius: 8, fontSize: 12, maxWidth: 480 }}>{msg}</div>}

      <div className="settings-section">
        <h3>Danger zone</h3>
        <div className="settings-row" style={{ borderTop: "none" }}><label>Wipe local data</label><button className="tool-btn" onClick={resetData}>Reset everything</button></div>
      </div>
    </>
  );
}

function SyncStatusRow() {
  const status = useLiveQuery(async () => (await db().settings.get("syncStatus"))?.value, []);
  const queueDepth = useLiveQuery(async () => db().syncQueue.count(), []) ?? 0;
  return (
    <div className="settings-row">
      <label>Status</label>
      <span className="settings-hint">
        Queue: <b>{queueDepth}</b> ·{" "}
        {status
          ? (status as any).skipped
            ? "no-config"
            : `flushed ${(status as any).flushed} · ${(status as any).lastError ? "err: " + (status as any).lastError : "ok"} · ${new Date((status as any).at).toLocaleTimeString()}`
          : "idle"}
      </span>
    </div>
  );
}
