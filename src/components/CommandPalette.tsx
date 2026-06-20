"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { searchAll, SearchResult } from "@/lib/search";
import { addTask, addNote } from "@/lib/db/hooks";
import { useTweaksLive } from "@/lib/tweaks";
import { useToast } from "./Toast";

type Item =
  | { kind: "action"; id: string; type: string; label: string; run: () => void | Promise<void> }
  | { kind: "result"; id: string; type: string; label: string; sub?: string; href: string };

const NAV: { label: string; href: string; keys: string }[] = [
  { label: "Today", href: "/today", keys: "today home dashboard" },
  { label: "Tasks", href: "/tasks", keys: "tasks todo" },
  { label: "Calendar", href: "/calendar", keys: "calendar events week schedule" },
  { label: "Notes", href: "/notes", keys: "notes" },
  { label: "Inbox", href: "/inbox", keys: "inbox triage" },
  { label: "Captures", href: "/captures", keys: "captures photos voice" },
  { label: "Saved", href: "/saved", keys: "saved links bookmarks" },
  { label: "Tags", href: "/tags", keys: "tags" },
  { label: "Areas", href: "/areas", keys: "areas" },
  { label: "Vault", href: "/vault", keys: "vault markdown notes second brain" },
  { label: "Assets", href: "/assets", keys: "assets index search projects" },
  { label: "Email", href: "/integrations/email", keys: "email gmail" },
  { label: "AI OS", href: "/integrations/aios", keys: "ai os agent workflows" },
  { label: "MCP catalog", href: "/integrations/mcps", keys: "mcp catalog" },
  { label: "Cosmo", href: "/integrations/cosmo", keys: "cosmo" },
  { label: "Settings", href: "/settings", keys: "settings preferences config sync" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const toast = useToast();
  const [tweaks, setTweak] = useTweaksLive();

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); setActive(0); }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const r = q.trim() ? await searchAll(q) : [];
      if (!cancelled) { setResults(r); setActive(0); }
    }, 120);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [q]);

  const items: Item[] = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out: Item[] = [];

    // Dynamic create actions (only when there's text to use as the title)
    if (q.trim()) {
      const text = q.trim();
      out.push({
        kind: "action", id: "new-task", type: "create",
        label: `New task: “${text}”`,
        run: async () => { await addTask(text, "today"); toast.success("Task added"); },
      });
      out.push({
        kind: "action", id: "new-note", type: "create",
        label: `New note: “${text}”`,
        run: async () => { await addNote(text, ""); toast.success("Note created"); },
      });
    }

    // Theme toggle
    const themeAction: Item = {
      kind: "action", id: "toggle-dark", type: "theme",
      label: tweaks.dark ? "Switch to light mode" : "Switch to dark mode",
      run: async () => { await setTweak("dark", !tweaks.dark); toast.toast(tweaks.dark ? "Light mode" : "Dark mode"); },
    };
    if (!query || "theme dark light mode".includes(query)) out.push(themeAction);

    // Navigation
    for (const n of NAV) {
      if (!query || n.label.toLowerCase().includes(query) || n.keys.includes(query)) {
        out.push({ kind: "action", id: "nav-" + n.href, type: "go", label: `Go to ${n.label}`, run: () => router.push(n.href) });
      }
    }

    // Search hits
    for (const r of results) {
      out.push({ kind: "result", id: r.type + r.id, type: r.type, label: r.label, sub: r.sub, href: r.href });
    }
    return out;
  }, [q, results, tweaks.dark]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const runItem = async (it: Item) => {
    if (it.kind === "result") { router.push(it.href); onClose(); return; }
    await it.run();
    // navigation actions close; create/theme stay open isn't needed — close for flow
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && items[active]) { e.preventDefault(); runItem(items[active]); }
  };

  return (
    <div className="cp-backdrop" onClick={onClose}>
      <div className="cp-panel" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cp-input"
          placeholder="Search or run a command — type to create, navigate, or find…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="cp-list">
          {items.length === 0 && <div className="cp-empty">No matches</div>}
          {items.map((it, i) => (
            <div
              key={it.kind + it.id}
              className={"cp-row" + (i === active ? " on" : "")}
              onClick={() => runItem(it)}
              onMouseEnter={() => setActive(i)}
            >
              <div className="type">{it.type}</div>
              <div className="label">
                {it.label}
                {it.kind === "result" && it.sub && (
                  <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 12 }}>· {it.sub}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
