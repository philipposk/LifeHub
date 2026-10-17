"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActorId, useTaskCounts, useNotes, useInboxCaptures } from "@/lib/db/hooks";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SAMPLE_USER_ID, isSampleActor, markSignedOutLocally, setActorId } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";
import {
  IconHome, IconCheckSquare, IconCalendar, IconNote, IconInbox,
  IconCamera, IconBookmark, IconHash, IconSettings, IconBell,
} from "./icons";

const NAV = [
  { group: "Workspace", items: [
    { id: "today",    label: "Today",    icon: IconHome,         href: "/today",    countKey: "today" },
    { id: "tasks",    label: "Tasks",    icon: IconCheckSquare,  href: "/tasks",    countKey: "tasks" },
    { id: "calendar", label: "Calendar", icon: IconCalendar,     href: "/calendar" },
    { id: "notes",    label: "Notes",    icon: IconNote,         href: "/notes",    countKey: "notes" },
    { id: "inbox",    label: "Inbox",    icon: IconInbox,        href: "/inbox",    countKey: "inbox" },
  ]},
  { group: "Library", items: [
    { id: "vault",    label: "Vault",    icon: IconNote,         href: "/vault",    countKey: "vault" },
    { id: "assets",   label: "Assets",   icon: IconBookmark,     href: "/assets",   countKey: "assets" },
    { id: "captures", label: "Captures", icon: IconCamera,       href: "/captures" },
    { id: "saved",    label: "Saved",    icon: IconBookmark,     href: "/saved" },
    { id: "tags",     label: "Tags",     icon: IconHash,         href: "/tags" },
    { id: "areas",    label: "Areas",    icon: IconHash,         href: "/areas" },
  ]},
  { group: "Integrations", items: [
    { id: "email",    label: "Email",          icon: IconBell,        href: "/integrations/email", countKey: "email" },
    { id: "aios",     label: "AI OS",          icon: IconCheckSquare, href: "/integrations/aios" },
    { id: "mcps",     label: "MCP catalog",    icon: IconBookmark,    href: "/integrations/mcps" },
    { id: "cosmo",    label: "Cosmo",          icon: IconNote,        href: "/integrations/cosmo" },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const actorId = useActorId();
  const sample = isSampleActor(actorId);
  const counts = useTaskCounts();
  const notes = useNotes();
  const inbox = useInboxCaptures();
  const emailUnread = useLiveQuery(async () => {
    const rows = await db().emails.where("userId").equals(actorId).toArray();
    return rows.filter(e => e.unread && !e.processed).length;
  }, [actorId]);

  const countFor = (key?: string): string | undefined => {
    if (!key || !counts) return undefined;
    if (key === "today")  return String(counts.today);
    if (key === "tasks")  return String(counts.total);
    if (key === "notes")  return notes ? String(notes.length) : undefined;
    if (key === "inbox")  return inbox ? String((inbox.length) + (emailUnread || 0)) : undefined;
    if (key === "email")  return emailUnread ? String(emailUnread) : undefined;
    return undefined;
  };

  return (
    <aside className="side">
      <div className="brand">
        <div className="brand-mark">L</div>
        <div className="brand-name">LifeHub</div>
        <div className="brand-sub mono">v0.4</div>
      </div>

      {NAV.map(group => (
        <div key={group.group} className="nav-group">
          <div className="nav-label">{group.group}</div>
          {group.items.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const c = countFor((item as any).countKey);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={"nav-item" + (active ? " active" : "")}
              >
                <Icon />
                <span>{item.label}</span>
                {c && <span className="nav-count">{c}</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="side-bottom">
        {sample ? (
          <Link href="/sign-in" className={"nav-item" + (pathname === "/sign-in" ? " active" : "")}>
            <IconSettings /><span>Sign in</span>
          </Link>
        ) : (
          <button
            className="nav-item"
            onClick={() => {
              markSignedOutLocally();
              setActorId(SAMPLE_USER_ID);
              if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
                void createClient().auth.signOut({ scope: "local" });
              }
            }}
          >
            <IconSettings /><span>Sign out</span>
          </button>
        )}
        <Link href="/settings" className={"nav-item" + (pathname === "/settings" ? " active" : "")}>
          <IconSettings /><span>Settings</span>
        </Link>
        <div className="quota">
          <div>{sample ? "Sample workspace" : "Your workspace"}</div>
          <div className="quota-bar"><i /></div>
          <div style={{ marginTop: 4, fontSize: 10.5 }}>{sample ? "Example people and tasks" : "Saved to your account"}</div>
        </div>
      </div>
    </aside>
  );
}
