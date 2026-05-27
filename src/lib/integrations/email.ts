"use client";
import { db, uid, LOCAL_USER_ID, EmailRow, EmailAccountRow } from "../db/schema";

type GmailConfig = { clientId?: string; clientSecret?: string; redirectUri?: string };
type GmailTokens = { accessToken: string; refreshToken: string; expiresAt: number; email: string };
type IMAPConfig = { host?: string; port?: number; user?: string; pass?: string; tls?: boolean };
type AICfg = { enabled?: boolean };

export const GMAIL_DEFAULT_REDIRECT = (typeof window !== "undefined" ? window.location.origin : "") + "/integrations/email/callback";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

// ── config storage ──
export async function getGmailConfig(): Promise<GmailConfig> {
  return ((await db().settings.get("gmail.config"))?.value as GmailConfig) || {};
}
export async function setGmailConfig(cfg: GmailConfig) {
  await db().settings.put({ key: "gmail.config", value: { ...(await getGmailConfig()), ...cfg } });
}
export async function getGmailTokens(): Promise<GmailTokens | null> {
  return ((await db().settings.get("gmail.tokens"))?.value as GmailTokens) || null;
}
export async function setGmailTokens(t: GmailTokens | null) {
  if (t === null) await db().settings.delete("gmail.tokens");
  else await db().settings.put({ key: "gmail.tokens", value: t });
}
export async function getIMAPConfig(): Promise<IMAPConfig> {
  return ((await db().settings.get("imap.config"))?.value as IMAPConfig) || {};
}
export async function setIMAPConfig(cfg: IMAPConfig) {
  await db().settings.put({ key: "imap.config", value: { ...(await getIMAPConfig()), ...cfg } });
}
export async function getAICfg(): Promise<AICfg> {
  return ((await db().settings.get("emailAI"))?.value as AICfg) || {};
}
export async function setAICfg(cfg: AICfg) {
  await db().settings.put({ key: "emailAI", value: { ...(await getAICfg()), ...cfg } });
}

// ── Gmail OAuth ──
export async function buildGmailAuthURL(): Promise<string | null> {
  const cfg = await getGmailConfig();
  if (!cfg.clientId) return null;
  const redirect = cfg.redirectUri || GMAIL_DEFAULT_REDIRECT;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirect,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES.join(" "),
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
}

export async function exchangeGmailCode(code: string): Promise<boolean> {
  const cfg = await getGmailConfig();
  if (!cfg.clientId || !cfg.clientSecret) return false;
  const redirect = cfg.redirectUri || GMAIL_DEFAULT_REDIRECT;
  const r = await fetch("/api/integrations/gmail/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, clientId: cfg.clientId, clientSecret: cfg.clientSecret, redirectUri: redirect }),
  });
  if (!r.ok) return false;
  const j = await r.json();
  if (!j.accessToken || !j.refreshToken) return false;
  await setGmailTokens({
    accessToken: j.accessToken,
    refreshToken: j.refreshToken,
    expiresAt: Date.now() + ((j.expiresIn || 3600) - 60) * 1000,
    email: j.email || "",
  });
  // upsert account row
  await db().emailAccounts.put({
    id: "gmail:" + (j.email || "primary"),
    userId: LOCAL_USER_ID,
    source: "gmail",
    address: j.email || "primary",
    addedAt: Date.now(),
  });
  return true;
}

async function ensureFreshGmailToken(): Promise<string | null> {
  const t = await getGmailTokens();
  if (!t) return null;
  if (Date.now() < t.expiresAt) return t.accessToken;
  const cfg = await getGmailConfig();
  if (!cfg.clientId || !cfg.clientSecret) return null;
  const r = await fetch("/api/integrations/gmail/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: t.refreshToken, clientId: cfg.clientId, clientSecret: cfg.clientSecret }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j.accessToken) return null;
  await setGmailTokens({ ...t, accessToken: j.accessToken, expiresAt: Date.now() + ((j.expiresIn || 3600) - 60) * 1000 });
  return j.accessToken;
}

export async function disconnectGmail() {
  const t = await getGmailTokens();
  await setGmailTokens(null);
  if (t?.email) await db().emailAccounts.delete("gmail:" + t.email);
}

// ── sync ──
export async function syncGmailUnread(limit = 25): Promise<{ added: number; total: number } | { error: string } | null> {
  const access = await ensureFreshGmailToken();
  if (!access) return { error: "no-token" };
  const tokens = await getGmailTokens();
  const r = await fetch("/api/integrations/gmail/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: access, limit, query: "is:unread OR is:starred" }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    return { error: j.error || `http ${r.status}` };
  }
  const j = await r.json();
  if (!Array.isArray(j.messages)) return { error: "bad-response" };
  const accountId = "gmail:" + (tokens?.email || "primary");

  const all = await db().emails.where("accountId").equals(accountId).toArray();
  const existing = new Map(all.map(e => [e.externalId, e]));
  let added = 0;
  for (const m of j.messages) {
    if (existing.has(m.id)) continue;
    const row: EmailRow = {
      id: uid(),
      userId: LOCAL_USER_ID,
      accountId,
      source: "gmail",
      externalId: m.id,
      threadId: m.threadId,
      from: m.from || "",
      fromEmail: m.fromEmail,
      subject: m.subject || "(no subject)",
      snippet: m.snippet,
      receivedAt: m.receivedAt || Date.now(),
      labels: m.labels || [],
      unread: !!m.unread,
      starred: !!m.starred,
      processed: false,
    };
    await db().emails.add(row);
    added++;
  }
  return { added, total: j.messages.length };
}

export async function syncIMAP(limit = 25): Promise<{ added: number; total: number } | null> {
  const cfg = await getIMAPConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) return null;
  const r = await fetch("/api/integrations/imap/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...cfg, limit }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j.ok) return null;
  return { added: 0, total: 0 };
}

// ── AI digest ──
export async function summarizeEmail(emailId: string): Promise<string | null> {
  const row = await db().emails.get(emailId);
  if (!row) return null;
  const oa = (await db().settings.get("openai"))?.value as { key?: string } | undefined;
  if (!oa?.key) return null;
  const r = await fetch("/api/integrations/email/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: oa.key,
      text: [`From: ${row.from}`, `Subject: ${row.subject}`, row.snippet].filter(Boolean).join("\n"),
    }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const summary = j.summary || null;
  if (summary) await db().emails.update(emailId, { summary });
  return summary;
}

export async function summarizeUnreadDigest(limit = 5): Promise<string | null> {
  const rows = (await db().emails.where("userId").equals(LOCAL_USER_ID).toArray())
    .filter(e => e.unread).sort((a, b) => b.receivedAt - a.receivedAt).slice(0, limit);
  if (rows.length === 0) return null;
  const oa = (await db().settings.get("openai"))?.value as { key?: string } | undefined;
  if (!oa?.key) return null;
  const text = rows.map(r => `From: ${r.from}\nSubject: ${r.subject}\n${r.snippet || ""}`).join("\n---\n");
  const r = await fetch("/api/integrations/email/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: oa.key, text, mode: "digest" }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.summary || null;
}
