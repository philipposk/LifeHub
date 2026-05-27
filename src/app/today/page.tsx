"use client";
import { useTasks, useTodayEvents, useHabits, useNotes, useInboxCaptures, useStreak, useAgentRuns, useMCPCatalog } from "@/lib/db/hooks";
import { pollAIOSWorkflow } from "@/lib/integrations/aios";
import { summarizeUnreadDigest } from "@/lib/integrations/email";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_USER_ID } from "@/lib/db/schema";
import { useEffect, useState } from "react";
import { TaskRow } from "@/components/TaskRow";
import { HabitRow } from "@/components/HabitRow";
import { QuickCapture } from "@/components/QuickCapture";
import { IconCalendar, IconPlus, IconArrow } from "@/components/icons";
import Link from "next/link";

const fmtTime = (ms: number) => {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h}:${m.toString().padStart(2, "0")}`;
};

const TODAY_LABEL = () => {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};

export default function TodayPage() {
  const tasks = useTasks({ section: "today" }) || [];
  const events = useTodayEvents() || [];
  const habitsData = useHabits();
  const notes = useNotes() || [];
  const inbox = useInboxCaptures() || [];
  const streak = useStreak() ?? 0;
  const agentRuns = useAgentRuns() || [];
  const mcpCatalog = useMCPCatalog() || [];

  const focus = tasks.filter(t => t.focus);
  const rest = tasks.filter(t => !t.focus);
  const done = tasks.filter(t => t.done).length;
  const runningRuns = agentRuns.filter(r => r.status === "running");
  const featuredMCP = mcpCatalog[Math.floor(Math.random() * mcpCatalog.length)];

  useEffect(() => {
    if (runningRuns.length === 0) return;
    const t = setInterval(() => {
      runningRuns.forEach(r => pollAIOSWorkflow(r.id));
    }, 5000);
    return () => clearInterval(t);
  }, [runningRuns.length]);

  const unreadEmails = useLiveQuery(async () => {
    const r = await db().emails.where("userId").equals(LOCAL_USER_ID).toArray();
    return r.filter(e => e.unread && !e.processed).sort((a, b) => b.receivedAt - a.receivedAt);
  }, []) || [];
  const [digest, setDigest] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (unreadEmails.length === 0) { setDigest(null); return; }
    (async () => {
      const s = await summarizeUnreadDigest(5);
      if (!cancelled) setDigest(s);
    })();
    return () => { cancelled = true; };
  }, [unreadEmails.length]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="hello">Good day, <em>You</em>.</div>
          <div className="date-strip" style={{ marginTop: 10 }}>
            {TODAY_LABEL()} <span className="dot" />
            <span className="stat-pill"><span className="dot" /><b>{done}</b> of {tasks.length} done</span>
            <span style={{ display: "inline-block", width: 8 }} />
            <span className="stat-pill">Streak <b>{streak} day{streak === 1 ? "" : "s"}</b></span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/calendar" className="tool-btn"><IconCalendar /> Plan day</Link>
          <Link href="/tasks" className="btn-primary"><IconPlus /> Quick add <span className="kbd">N</span></Link>
        </div>
      </div>

      <div className="grid">
        <div className="col">
          <QuickCapture />

          <div className="card">
            <div className="card-hd">
              <h3>Focus <span className="tag">{focus.length + Math.min(rest.length, 3)} tasks</span></h3>
              <Link href="/tasks" className="more">View all →</Link>
            </div>
            <div className="card-body">
              {focus.map(t => <TaskRow key={t.id} t={t} />)}
              {rest.slice(0, 3).map(t => <TaskRow key={t.id} t={t} />)}
              <Link href="/tasks" className="add-task">
                <div className="plus"><IconPlus /></div>
                <span>Add a task…</span>
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <h3>Today's schedule</h3>
              <Link href="/calendar" className="more">Open calendar →</Link>
            </div>
            <div className="card-body">
              {events.length === 0 && (
                <div style={{ padding: 12, color: "var(--muted)", fontSize: 13 }}>No events today.</div>
              )}
              {events.map((e, i) => {
                const cls = e.color && e.color !== "default" ? e.color : "";
                return (
                  <div key={e.id} className="cal-row">
                    <div className="cal-time">
                      <b>{fmtTime(e.start)}</b>{fmtTime(e.end)}
                    </div>
                    <div className={"cal-event " + cls}>
                      <div className="cal-title">{e.title}</div>
                      {e.sub && <div className="cal-sub">{e.sub}</div>}
                      <div className="cal-attendees">
                        {e.attendees.map((a, j) => <div key={j} className="av">{a}</div>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-hd">
              <h3>Habits <span className="tag">Week</span></h3>
              <span className="more">···</span>
            </div>
            <div className="card-body">
              <div className="habit-grid">
                {habitsData?.habits.map(h => (
                  <HabitRow key={h.id} habit={h} logs={habitsData.logsByHabit[h.id] || []} />
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <h3>Recent notes</h3>
              <Link href="/notes" className="more">All notes →</Link>
            </div>
            <div className="card-body">
              {notes.slice(0, 3).map(n => (
                <Link key={n.id} href="/notes" className="note-card" style={{ display: "block", textDecoration: "none" }}>
                  <div className="note-title">{n.title}</div>
                  <div className="note-prev">{n.body}</div>
                  <div className="note-meta">
                    {n.tag && <span>{n.tag}</span>}
                    {n.tag && <span className="dot" />}
                    {n.time && <span>{n.time}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {agentRuns.length > 0 && (
            <div className="card">
              <div className="card-hd">
                <h3>Agent runs <span className="tag">{runningRuns.length} running</span></h3>
                <Link href="/integrations/aios" className="more">Open →</Link>
              </div>
              <div className="card-body">
                {agentRuns.slice(0, 4).map(r => (
                  <div key={r.id} className="task">
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: r.status === "running" ? "var(--accent)" : r.status === "completed" ? "#5C8A5C" : "var(--danger)" }} />
                    <div className="task-text" style={{ fontSize: 13 }}>{r.prompt.slice(0, 60)}</div>
                    <div className="task-meta">{r.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unreadEmails.length > 0 && (
            <div className="card">
              <div className="card-hd">
                <h3>Email digest <span className="tag">{unreadEmails.length} unread</span></h3>
                <Link href="/integrations/email" className="more">Open →</Link>
              </div>
              <div className="card-body">
                {digest ? (
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink-2)", margin: 0 }}>{digest}</pre>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {unreadEmails.slice(0, 4).map(e => (
                      <div key={e.id} style={{ fontSize: 12.5 }}>
                        <div style={{ color: "var(--muted)" }}>{e.from}</div>
                        <div style={{ fontWeight: 600 }}>{e.subject}</div>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>
                      Add OpenAI key in Settings to get a 3-bullet digest.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {featuredMCP && (
            <div className="card">
              <div className="card-hd">
                <h3>MCP pick</h3>
                <Link href="/integrations/mcps" className="more">Browse →</Link>
              </div>
              <div className="card-body" style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{featuredMCP.name}</div>
                {featuredMCP.description && <div style={{ color: "var(--muted)", marginTop: 4 }}>{featuredMCP.description}</div>}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-hd">
              <h3>Inbox <span className="tag">{inbox.length} new</span></h3>
              <Link href="/inbox" className="more">Open inbox →</Link>
            </div>
            <div className="card-body">
              {inbox.length === 0 && (
                <div style={{ padding: 12, color: "var(--muted)", fontSize: 13 }}>Nothing in inbox.</div>
              )}
              {inbox.slice(0, 3).map((c) => (
                <div key={c.id} className="task">
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
                    <IconArrow style={{ width: 12, height: 12, color: "var(--muted)" } as any} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="task-text" style={{ fontSize: 13 }}>{c.body || c.kind}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{c.kind} · {c.tags.join(", ") || "untagged"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
