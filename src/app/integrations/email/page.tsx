"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_USER_ID } from "@/lib/db/schema";
import {
  getGmailConfig, setGmailConfig, getGmailTokens, disconnectGmail,
  buildGmailAuthURL, syncGmailUnread,
  getIMAPConfig, setIMAPConfig, syncIMAP,
  getAICfg, setAICfg,
  GMAIL_DEFAULT_REDIRECT, summarizeEmail,
} from "@/lib/integrations/email";
import { addTask, addNote } from "@/lib/db/hooks";

export default function EmailPage() {
  const emails = useLiveQuery(async () => {
    const r = await db().emails.where("userId").equals(LOCAL_USER_ID).toArray();
    return r.sort((a, b) => b.receivedAt - a.receivedAt);
  }, []) || [];
  const accounts = useLiveQuery(async () => db().emailAccounts.where("userId").equals(LOCAL_USER_ID).toArray(), []) || [];

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [imapTls, setImapTls] = useState(true);
  const [ai, setAI] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("unread");

  useEffect(() => {
    (async () => {
      const g = await getGmailConfig();
      setClientId(g.clientId || "");
      setClientSecret(g.clientSecret || "");
      setRedirectUri(g.redirectUri || GMAIL_DEFAULT_REDIRECT);
      const i = await getIMAPConfig();
      setImapHost(i.host || ""); setImapPort(i.port || 993);
      setImapUser(i.user || ""); setImapPass(i.pass || "");
      setImapTls(i.tls !== false);
      setAI(!!(await getAICfg()).enabled);
    })();
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const tokens = useLiveQuery(getGmailTokens, []);

  const saveGmail = async () => { await setGmailConfig({ clientId, clientSecret, redirectUri }); flash("Gmail config saved."); };
  const connectGmail = async () => {
    await setGmailConfig({ clientId, clientSecret, redirectUri });
    const url = await buildGmailAuthURL();
    if (!url) { flash("Set clientId first."); return; }
    window.location.href = url;
  };
  const disconnect = async () => { await disconnectGmail(); flash("Disconnected."); };
  const sync = async () => {
    flash("Syncing Gmail…");
    const r = await syncGmailUnread();
    if (!r) { flash("Sync returned null."); return; }
    if ("error" in r) { flash("Sync failed: " + r.error); return; }
    flash(`Added ${r.added}/${r.total} emails.`);
  };
  const saveImap = async () => { await setIMAPConfig({ host: imapHost, port: imapPort, user: imapUser, pass: imapPass, tls: imapTls }); flash("IMAP saved."); };
  const syncImap = async () => {
    const r = await syncIMAP();
    flash(r ? `Added ${r.added}/${r.total}.` : "IMAP not implemented in LifeHub. Use Triage app.");
  };
  const toggleAI = async (v: boolean) => { setAI(v); await setAICfg({ enabled: v }); };

  const shown = emails.filter(e => filter === "all" || (filter === "unread" && e.unread) || (filter === "starred" && e.starred));

  const promote = async (id: string, kind: "task" | "note") => {
    const e = await db().emails.get(id);
    if (!e) return;
    const text = `${e.from}: ${e.subject}${e.snippet ? " — " + e.snippet : ""}`;
    if (kind === "task") await addTask(e.subject || text, "today");
    else await addNote(e.subject || "Email", text);
    await db().emails.update(id, { promoted: kind, processed: true });
  };
  const summarize = async (id: string) => { await summarizeEmail(id); };
  const togglProcessed = async (id: string, processed: boolean) => { await db().emails.update(id, { processed: !processed }); };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Email</div>
          <div className="view-sub">{accounts.length} account{accounts.length === 1 ? "" : "s"} · {emails.filter(e => e.unread).length} unread</div>
        </div>
        <div className="filter-bar">
          {(["unread", "starred", "all"] as const).map(k => (
            <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{k[0].toUpperCase() + k.slice(1)}</button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Gmail (OAuth)</h3>
        <div className="settings-hint" style={{ marginBottom: 10 }}>
          Create an OAuth client in Google Cloud Console (Application type: Web). Add redirect URI: <code>{GMAIL_DEFAULT_REDIRECT}</code>. Paste the client id + secret below.
        </div>
        <div className="settings-row" style={{ borderTop: "none" }}><label>Client ID</label><input type="text" value={clientId} onChange={e => setClientId(e.target.value)} /></div>
        <div className="settings-row"><label>Client secret</label><input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} /></div>
        <div className="settings-row"><label>Redirect URI</label><input type="text" value={redirectUri} onChange={e => setRedirectUri(e.target.value)} /></div>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <button className="btn-primary" onClick={saveGmail} disabled={!clientId}>Save</button>
          <button className="tool-btn" onClick={connectGmail} disabled={!clientId || !clientSecret}>Connect</button>
          {tokens && <button className="tool-btn" onClick={disconnect}>Disconnect ({tokens.email})</button>}
          {tokens && <button className="tool-btn" onClick={sync}>Sync now</button>}
        </div>
      </div>

      <div className="settings-section">
        <h3>IMAP <span className="settings-hint" style={{ marginLeft: 8 }}>(stub — full client in Triage app)</span></h3>
        <div className="settings-row" style={{ borderTop: "none" }}><label>Host</label><input type="text" value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.fastmail.com" /></div>
        <div className="settings-row"><label>Port</label><input type="text" value={imapPort} onChange={e => setImapPort(Number(e.target.value) || 993)} /></div>
        <div className="settings-row"><label>User</label><input type="text" value={imapUser} onChange={e => setImapUser(e.target.value)} /></div>
        <div className="settings-row"><label>App password</label><input type="password" value={imapPass} onChange={e => setImapPass(e.target.value)} /></div>
        <div className="settings-row"><label>TLS</label><input type="checkbox" checked={imapTls} onChange={e => setImapTls(e.target.checked)} /></div>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <button className="btn-primary" onClick={saveImap}>Save</button>
          <button className="tool-btn" onClick={syncImap}>Try sync</button>
        </div>
      </div>

      <div className="settings-section">
        <h3>AI digest</h3>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <label>Auto-summarize on fetch</label>
          <input type="checkbox" checked={ai} onChange={e => toggleAI(e.target.checked)} />
        </div>
        <div className="settings-hint">Requires OpenAI key (Settings → AI). Adds a 1-line summary to each email and a 3-bullet digest on Today.</div>
      </div>

      {msg && <div style={{ position: "fixed", bottom: 20, left: 20, background: "var(--ink)", color: "var(--bg)", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>{msg}</div>}

      <div className="task-section">
        <div className="task-section-hd">
          <div className="ttl">Emails</div>
          <div className="cnt">{shown.length}</div>
        </div>
        {shown.length === 0 && <div style={{ color: "var(--muted)", padding: 24, textAlign: "center" }}>No emails. Connect Gmail above and click Sync now.</div>}
        {shown.map(e => (
          <div key={e.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, marginTop: 7, background: e.unread ? "var(--accent)" : "var(--muted-2)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{e.from}</div>
                  {e.starred && <span style={{ color: "#C8A24F", fontSize: 11 }}>★</span>}
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{new Date(e.receivedAt).toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{e.subject}</div>
                {e.snippet && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>{e.snippet}</div>}
                {e.summary && (
                  <div style={{ fontSize: 12, color: "var(--accent-ink)", background: "var(--accent-soft)", padding: "6px 10px", borderRadius: 6, marginTop: 8 }}>
                    AI: {e.summary}
                  </div>
                )}
                {e.labels.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {e.labels.filter(l => !l.startsWith("CATEGORY_")).map(l => <span key={l} className="chip">{l}</span>)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button className="tool-btn" onClick={() => promote(e.id, "task")}>→ Task</button>
                <button className="tool-btn" onClick={() => promote(e.id, "note")}>→ Note</button>
                {!e.summary && <button className="tool-btn" onClick={() => summarize(e.id)}>AI summary</button>}
                <button className="tool-btn" onClick={() => togglProcessed(e.id, e.processed)}>{e.processed ? "Unmark" : "Done"}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
