"use client";
import Link from "next/link";
import { useInboxCaptures } from "@/lib/db/hooks";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_USER_ID } from "@/lib/db/schema";
import { addTask, addNote } from "@/lib/db/hooks";

export default function InboxPage() {
  const inbox = useInboxCaptures() || [];
  const emails = useLiveQuery(async () => {
    const r = await db().emails.where("userId").equals(LOCAL_USER_ID).toArray();
    return r.filter(e => !e.processed && (e.unread || e.starred)).sort((a, b) => b.receivedAt - a.receivedAt);
  }, []) || [];

  const promoteCapToTask = async (capId: string, text: string) => {
    await addTask(text, "today");
    await db().captures.update(capId, { processed: true });
  };
  const promoteCapToNote = async (capId: string, text: string) => {
    const firstLine = text.split("\n")[0].slice(0, 80);
    await addNote(firstLine || "From inbox", text);
    await db().captures.update(capId, { processed: true });
  };
  const discardCap = async (capId: string) => { await db().captures.update(capId, { processed: true }); };
  const promoteEmail = async (emailId: string, kind: "task" | "note") => {
    const e = await db().emails.get(emailId);
    if (!e) return;
    const text = `${e.from}: ${e.subject}${e.snippet ? " — " + e.snippet : ""}`;
    if (kind === "task") await addTask(e.subject || text, "today");
    else await addNote(e.subject || "Email", text);
    await db().emails.update(emailId, { promoted: kind, processed: true });
  };
  const discardEmail = async (emailId: string) => { await db().emails.update(emailId, { processed: true }); };

  const total = inbox.length + emails.length;

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Inbox</div>
          <div className="view-sub">{total} unprocessed · {inbox.length} captures · {emails.length} emails</div>
        </div>
        <Link href="/integrations/email" className="tool-btn">Email settings →</Link>
      </div>

      {total === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          Inbox empty. Capture from Today or connect Gmail in <Link href="/integrations/email">Email integration</Link>.
        </div>
      )}

      {emails.length > 0 && (
        <div className="task-section">
          <div className="task-section-hd">
            <div className="ttl">Email</div>
            <div className="cnt">{emails.length}</div>
          </div>
          {emails.map(e => (
            <div key={e.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, marginTop: 7, background: e.unread ? "var(--accent)" : "var(--muted-2)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{e.from} · {new Date(e.receivedAt).toLocaleString()}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.subject}</div>
                  {e.snippet && <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{e.snippet}</div>}
                  {e.summary && <div style={{ fontSize: 12, color: "var(--accent-ink)", background: "var(--accent-soft)", padding: "4px 8px", borderRadius: 6, marginTop: 4 }}>{e.summary}</div>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="tool-btn" onClick={() => promoteEmail(e.id, "task")}>→ Task</button>
                  <button className="tool-btn" onClick={() => promoteEmail(e.id, "note")}>→ Note</button>
                  <button className="tool-btn" onClick={() => discardEmail(e.id)}>Done</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {inbox.length > 0 && (
        <div className="task-section">
          <div className="task-section-hd">
            <div className="ttl">Captures</div>
            <div className="cnt">{inbox.length}</div>
          </div>
          {inbox.map(c => (
            <div key={c.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>{c.kind}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5 }}>{c.body || "(no body)"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{new Date(c.createdAt).toLocaleString()}{c.tags.length ? " · " + c.tags.join(", ") : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="tool-btn" onClick={() => promoteCapToTask(c.id, c.body || c.kind)}>→ Task</button>
                  <button className="tool-btn" onClick={() => promoteCapToNote(c.id, c.body || c.kind)}>→ Note</button>
                  <button className="tool-btn" onClick={() => discardCap(c.id)}>Discard</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
