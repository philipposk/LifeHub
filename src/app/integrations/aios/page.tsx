"use client";
import { useEffect, useState } from "react";
import { useAgentRuns } from "@/lib/db/hooks";
import { getAIOSConfig, setAIOSConfig, startAIOSWorkflow, pollAIOSWorkflow, getAIOSAccounting } from "@/lib/integrations/aios";

export default function AIOSPage() {
  const runs = useAgentRuns() || [];
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [acc, setAcc] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    getAIOSConfig().then(c => {
      if (c) { setBaseUrl(c.baseUrl || ""); setApiKey(c.apiKey || ""); }
    });
    getAIOSAccounting().then(setAcc);
  }, []);

  const save = async () => {
    if (!baseUrl) return;
    await setAIOSConfig(baseUrl, apiKey || undefined);
    setStatus("Saved.");
    setTimeout(() => setStatus(""), 2000);
  };
  const send = async () => {
    if (!prompt.trim()) return;
    setStatus("Starting…");
    const out = await startAIOSWorkflow(prompt.trim());
    setStatus(out ? `Started: ${out.workflowId}` : "Failed.");
    setPrompt("");
    setTimeout(() => setStatus(""), 3000);
  };

  // Poll running rows every 5s
  useEffect(() => {
    const t = setInterval(() => {
      runs.filter(r => r.status === "running").forEach(r => pollAIOSWorkflow(r.id));
    }, 5000);
    return () => clearInterval(t);
  }, [runs.length]);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">AI OS</div>
          <div className="view-sub">{runs.length} run{runs.length === 1 ? "" : "s"} · {runs.filter(r => r.status === "running").length} active</div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Connection</h3>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <label>Base URL</label>
          <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://localhost:8080" />
        </div>
        <div className="settings-row">
          <label>API key (optional)</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>
        <div className="settings-row" style={{ borderTop: "none" }}>
          <button className="btn-primary" onClick={save} disabled={!baseUrl}>Save</button>
          {status && <span className="settings-hint">{status}</span>}
        </div>
      </div>

      <div className="settings-section">
        <h3>Send workflow</h3>
        <textarea
          rows={3}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe what AI OS should do…"
          style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, color: "var(--ink)", outline: "none", fontFamily: "inherit", fontSize: 13 }}
        />
        <div style={{ marginTop: 8 }}>
          <button className="btn-primary" onClick={send} disabled={!prompt.trim()}>Send</button>
        </div>
      </div>

      {acc && (
        <div className="settings-section">
          <h3>Accounting</h3>
          <div className="settings-hint">
            {acc.total != null ? `Total: $${Number(acc.total).toFixed(4)}` : ""}{" "}
            {acc.runs != null ? ` · ${acc.runs} runs` : ""}
          </div>
        </div>
      )}

      <div className="task-section">
        <div className="task-section-hd">
          <div className="ttl">Runs</div>
          <div className="cnt">{runs.length}</div>
        </div>
        {runs.map(r => (
          <div key={r.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, marginTop: 6, background: r.status === "running" ? "var(--accent)" : r.status === "completed" ? "#5C8A5C" : "var(--danger)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5 }}>{r.prompt}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                  {r.workflowId} · {r.status} · {new Date(r.updatedAt).toLocaleTimeString()}
                </div>
                {r.resultText && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 8, whiteSpace: "pre-wrap" }}>{r.resultText}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
