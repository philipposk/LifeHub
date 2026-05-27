"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { VAULT_TYPES } from "@/lib/vault/schema";

interface ListItem {
  path: string;
  id: string;
  type: string;
  title: string;
  tags: string[];
  projects: string[];
  status: string;
  created?: string;
  updated?: string;
  preview: string;
}

interface Entry {
  path: string;
  absPath: string;
  frontmatter: any;
  body: string;
}

export default function VaultPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading vault…</div>}>
      <VaultInner />
    </Suspense>
  );
}

function VaultInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("path") || undefined;

  const [list, setList] = useState<ListItem[]>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<typeof VAULT_TYPES[number]>("idea");
  const [newTitle, setNewTitle] = useState("");

  async function loadList(): Promise<void> {
    const r = await fetch("/api/vault/list");
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error || `list failed: ${r.status}`);
      setList([]);
      return;
    }
    const j = await r.json();
    setList(j.entries || []);
  }

  async function loadEntry(p: string): Promise<void> {
    const r = await fetch(`/api/vault/entry/${p.split("/").map(encodeURIComponent).join("/")}`);
    if (!r.ok) { setEntry(null); return; }
    const j: Entry = await r.json();
    setEntry(j);
    setBody(j.body);
    setTagsInput((j.frontmatter.tags || []).join(", "));
  }

  async function save(): Promise<void> {
    if (!entry) return;
    setBusy(true);
    try {
      const tags = tagsInput.split(",").map(s => s.trim()).filter(Boolean);
      const r = await fetch(`/api/vault/entry/${entry.path.split("/").map(encodeURIComponent).join("/")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, meta: { tags } }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setMsg(j.error || `save failed: ${r.status}`);
        return;
      }
      setMsg("saved");
      setTimeout(() => setMsg(null), 1200);
      await loadList();
    } finally {
      setBusy(false);
    }
  }

  async function remove(): Promise<void> {
    if (!entry) return;
    if (!confirm(`Delete ${entry.path}?`)) return;
    const r = await fetch(`/api/vault/entry/${entry.path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "DELETE",
    });
    if (r.ok) {
      router.push("/vault");
      setEntry(null);
      await loadList();
    }
  }

  async function createNew(): Promise<void> {
    if (!newTitle.trim()) return;
    const r = await fetch("/api/vault/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: newType, title: newTitle.trim(), body: "" }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error || "create failed");
      return;
    }
    const j: Entry = await r.json();
    setNewTitle("");
    setCreating(false);
    await loadList();
    router.push(`/vault?path=${encodeURIComponent(j.path)}`);
  }

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (selected) loadEntry(selected); else setEntry(null); }, [selected]);

  // group list by top-level dir
  const grouped: Record<string, ListItem[]> = {};
  for (const e of list) {
    const dir = e.path.split("/")[0];
    (grouped[dir] = grouped[dir] || []).push(e);
  }

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Vault</div>
          <div className="view-sub">{list.length} entries · <code style={{ fontSize: 11 }}>~/SecondBrain/vault</code></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" onClick={() => setCreating(v => !v)}>+ New</button>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: 12, fontSize: 12.5, color: "var(--muted)" }}>{msg}</div>
      )}

      {creating && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-body" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={newType} onChange={e => setNewType(e.target.value as any)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg-1)", color: "var(--ink)" }}>
              {VAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              placeholder="Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createNew(); }}
              style={{ flex: "1 1 240px", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg-1)", color: "var(--ink)" }}
            />
            <button className="btn-primary" onClick={createNew} disabled={!newTitle.trim()}>Create</button>
            <button className="tool-btn" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 18 }}>
        <aside style={{ borderRight: "1px solid var(--line)", paddingRight: 12, maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
          {Object.keys(grouped).sort().map(dir => (
            <div key={dir} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)", marginBottom: 4 }}>{dir}</div>
              {grouped[dir].map(e => (
                <button
                  key={e.path}
                  onClick={() => router.push(`/vault?path=${encodeURIComponent(e.path)}`)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "5px 8px", borderRadius: 6, border: 0,
                    background: selected === e.path ? "var(--bg-2)" : "transparent",
                    color: "var(--ink)", cursor: "pointer", fontSize: 13,
                  }}
                >
                  {e.title}
                </button>
              ))}
            </div>
          ))}
          {list.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Empty. Create your first entry.</div>
          )}
        </aside>

        <section>
          {entry ? (
            <>
              <div style={{ marginBottom: 12, color: "var(--muted)", fontSize: 12 }}>
                <code>{entry.path}</code> · {entry.frontmatter.type} · {entry.frontmatter.status}
              </div>
              <input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="tags, comma-separated"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg-1)", color: "var(--ink)", marginBottom: 10 }}
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{
                  width: "100%", minHeight: 360, padding: 12,
                  borderRadius: 8, border: "1px solid var(--line)",
                  background: "var(--bg-1)", color: "var(--ink)",
                  fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 13.5,
                  lineHeight: 1.55, resize: "vertical",
                }}
              />
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                <button className="tool-btn" onClick={remove} disabled={busy} style={{ color: "var(--danger)" }}>Delete</button>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--muted)", padding: "40px 0" }}>
              Select an entry on the left, or create a new one.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
