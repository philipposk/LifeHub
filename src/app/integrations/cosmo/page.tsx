"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_USER_ID } from "@/lib/db/schema";


import { getCosmoConfig, setCosmoConfig, syncCosmoProfile, tryLinkByEmail } from "@/lib/integrations/cosmo";

export default function CosmoPage() {
  const profiles = useLiveQuery(async () => db().cosmoProfiles.where("userId").equals(LOCAL_USER_ID).toArray(), []) || [];
  const content = useLiveQuery(async () => {
    const r = await db().cosmoContent.where("userId").equals(LOCAL_USER_ID).toArray();
    return r.sort((a, b) => b.createdAt - a.createdAt);
  }, []) || [];

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [extId, setExtId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => { getCosmoConfig().then(c => { if (c) { setBaseUrl(c.baseUrl || ""); setApiKey(c.apiKey || ""); }}); }, []);

  const save = async () => {
    if (!baseUrl) return;
    await setCosmoConfig(baseUrl, apiKey || undefined);
    setStatus("Saved.");
    setTimeout(() => setStatus(""), 2000);
  };
  const sync = async () => {
    if (!extId.trim()) return;
    setStatus("Syncing…");
    const ok = await syncCosmoProfile(extId.trim());
    setStatus(ok ? "Synced." : "Failed.");
    setTimeout(() => setStatus(""), 3000);
  };
  const link = async () => {
    setStatus("Linking…");
    const r = await tryLinkByEmail();
    setStatus(r.linked ? `Linked as ${r.email}` : `Not linked: ${r.reason}`);
    setTimeout(() => setStatus(""), 4000);
  };

  const me = useLiveQuery(async () => db().users.get(LOCAL_USER_ID), []);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Cosmo</div>
          <div className="view-sub">{profiles.length} profile{profiles.length === 1 ? "" : "s"} · {content.length} item{content.length === 1 ? "" : "s"} mirrored · read-only</div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Connection</h3>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <label>Base URL</label>
          <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://localhost:4000" />
        </div>
        <div className="settings-row">
          <label>API key (optional)</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>
        <div className="settings-row">
          <label>Your Cosmo user id</label>
          <input type="text" value={extId} onChange={e => setExtId(e.target.value)} />
        </div>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <button className="btn-primary" onClick={save} disabled={!baseUrl}>Save</button>
          <button className="tool-btn" onClick={sync} disabled={!extId.trim()}>Sync now</button>
          <button className="tool-btn" onClick={link}>Link by email</button>
          {status && <span className="settings-hint">{status}</span>}
        </div>
        <div className="settings-row">
          <label>Link status</label>
          <span className="settings-hint">
            {me?.cosmoLinked ? `Linked · ${me.email || "(no email)"}` : "Not linked. Save Cosmo creds, Sync your profile, then click Link by email (requires Supabase session)."}
          </span>
        </div>
      </div>

      <div className="task-section">
        <div className="task-section-hd">
          <div className="ttl">Recent content</div>
          <div className="cnt">{content.length}</div>
        </div>
        {content.slice(0, 20).map(c => (
          <div key={c.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.title || "(untitled)"}</div>
            {c.body && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>{c.body.slice(0, 240)}</div>}
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              {new Date(c.createdAt).toLocaleString()}{c.url ? " · " + c.url : ""}
            </div>
          </div>
        ))}
        {content.length === 0 && <div style={{ color: "var(--muted)" }}>Nothing mirrored yet.</div>}
      </div>
    </>
  );
}
