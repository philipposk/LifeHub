"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Hit {
  id: string;
  source: string;
  project?: string;
  type: string;
  title?: string;
  tags: string[];
  path: string;
  vault_path?: string;
  preview?: string;
  snippet?: string;
}

const TYPE_CHIPS: { key: string; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "prompt",   label: "Prompts" },
  { key: "agent",    label: "Agents" },
  { key: "template", label: "Templates" },
  { key: "snippet",  label: "Snippets" },
  { key: "research", label: "Research" },
  { key: "sop",      label: "SOPs" },
];

export default function AssetsPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [hits, setHits] = useState<Hit[]>([]);
  const [stats, setStats] = useState<{ total: number; bySource: Record<string, number>; byType: Record<string, number> } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  async function reload(): Promise<void> {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type !== "all") params.set("type", type);
    params.set("limit", "100");
    const r = await fetch(`/api/search?${params}`);
    const j = await r.json();
    setHits(j.hits || []);
  }

  async function loadStats(): Promise<void> {
    const r = await fetch("/api/scan");
    setStats(await r.json());
  }

  async function rescan(full: boolean): Promise<void> {
    setScanning(true);
    setScanMsg(null);
    try {
      const r = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullRebuild: full }),
      });
      const j = await r.json();
      setScanMsg(`indexed ${j.vaultIndexed} vault + ${j.projectsIndexed} project assets`);
      setStats(j.stats);
      await reload();
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => { loadStats(); reload(); }, []);
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type]);

  const typeCounts = useMemo(() => stats?.byType || {}, [stats]);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Assets</div>
          <div className="view-sub">
            {stats ? `${stats.total} indexed · vault ${stats.bySource.vault || 0} · projects ${stats.bySource.project || 0}` : "loading…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="tool-btn" onClick={() => rescan(false)} disabled={scanning}>
            {scanning ? "Scanning…" : "Rescan"}
          </button>
          <button className="tool-btn" onClick={() => rescan(true)} disabled={scanning}>
            Full rebuild
          </button>
        </div>
      </div>

      {scanMsg && (
        <div style={{ marginBottom: 16, fontSize: 12.5, color: "var(--muted)" }}>{scanMsg}</div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="search-input"
          style={{ flex: "1 1 320px", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-1)", color: "var(--ink)" }}
          placeholder="Search title, body, tags…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") reload(); }}
        />
        <button className="btn-primary" onClick={reload}>Search</button>
      </div>

      <div className="filter-bar" style={{ display: "inline-flex", marginBottom: 22, flexWrap: "wrap" }}>
        {TYPE_CHIPS.map(c => (
          <button
            key={c.key}
            className={type === c.key ? "on" : ""}
            onClick={() => setType(c.key)}
          >
            {c.label}
            {c.key !== "all" && typeCounts[c.key] !== undefined && (
              <span style={{ marginLeft: 6, color: "var(--muted)" }}>{typeCounts[c.key]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="notes-grid">
        {hits.length === 0 && (
          <div style={{ color: "var(--muted)" }}>
            No assets match. Try rescan, or relax filters.
          </div>
        )}
        {hits.map(h => (
          <AssetCard key={h.id} hit={h} />
        ))}
      </div>
    </>
  );
}

function AssetCard({ hit }: { hit: Hit }) {
  const isVault = hit.source === "vault";
  const href = isVault && hit.vault_path
    ? `/vault?path=${encodeURIComponent(hit.vault_path)}`
    : undefined;
  const body = (
    <>
      <h4>{hit.title || hit.id}</h4>
      <div className="body" style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: hit.snippet || (hit.preview || "") }} />
      <div className="foot" style={{ flexWrap: "wrap" }}>
        <span className="pin" style={{ background: typeColor(hit.type), color: "white" }}>{hit.type}</span>
        {hit.project && <span>{hit.project}</span>}
        <span>·</span>
        <span style={{ color: "var(--muted)" }}>{hit.source}</span>
        {hit.tags.slice(0, 4).map(t => <span key={t}>#{t}</span>)}
      </div>
    </>
  );
  return href
    ? <Link href={href} className="note-tile" style={{ textDecoration: "none", color: "inherit" }}>{body}</Link>
    : <div className="note-tile">{body}</div>;
}

function typeColor(t: string): string {
  switch (t) {
    case "prompt":   return "#4A6FA5";
    case "agent":    return "#5C6B4A";
    case "template": return "#8C6F4A";
    case "snippet":  return "#3D3D3D";
    case "research": return "#9A4F5C";
    default:         return "#666";
  }
}
