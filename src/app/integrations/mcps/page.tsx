"use client";
import { useState, useMemo } from "react";
import { useMCPCatalog } from "@/lib/db/hooks";
import { refreshMCPCatalog, getABConfig, setABConfig } from "@/lib/integrations/appblueprints";

export default function MCPsPage() {
  const items = useMCPCatalog() || [];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dir, setDir] = useState("");

  useMemo(() => { getABConfig().then(c => setDir(c?.dataDir || "")); }, []);

  const filtered = q
    ? items.filter(i => (i.name + " " + (i.description || "") + " " + (i.category || "")).toLowerCase().includes(q.toLowerCase()))
    : items;

  const reload = async () => {
    setStatus("Loading…");
    const n = await refreshMCPCatalog();
    setStatus(`Loaded ${n} entries.`);
    setTimeout(() => setStatus(""), 3000);
  };

  const saveDir = async () => {
    if (!dir.trim()) return;
    await setABConfig(dir.trim());
    setStatus("Saved.");
    await reload();
  };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">MCP catalog</div>
          <div className="view-sub">From AppBlueprints · {items.length} entr{items.length === 1 ? "y" : "ies"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="tool-btn" onClick={reload}>Refresh</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-row" style={{ borderTop: "none" }}>
          <label>AppBlueprints data dir</label>
          <input type="text" value={dir} onChange={e => setDir(e.target.value)} placeholder="/Users/you/Devoloper Projects/AppBlueprints/data/mcps" />
          <button className="btn-primary" onClick={saveDir}>Save</button>
        </div>
        <div className="settings-hint">{status || "Set the absolute path to the AppBlueprints `data/mcps` folder. The server will read its JSON files."}</div>
      </div>

      <input
        className="cp-input"
        style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 12 }}
        placeholder="Filter MCPs…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      <div className="notes-grid">
        {filtered.map(m => (
          <div key={m.id} className="note-tile">
            <h4>{m.name}</h4>
            <div className="body">{m.description || "(no description)"}</div>
            <div className="foot">
              {m.category && <span>#{m.category}</span>}
              <span>·</span>
              <span>{new Date(m.fetchedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: "var(--muted)" }}>No entries. Set the data dir above and click Refresh.</div>}
      </div>
    </>
  );
}
