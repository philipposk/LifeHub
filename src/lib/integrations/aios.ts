"use client";
import { db, uid, LOCAL_USER_ID, AgentRunRow } from "../db/schema";

type AIOSConfig = { baseUrl?: string; apiKey?: string };

export async function getAIOSConfig(): Promise<AIOSConfig | null> {
  const cfg = (await db().settings.get("aios"))?.value as AIOSConfig | undefined;
  if (!cfg?.baseUrl) return null;
  return cfg;
}

export async function setAIOSConfig(baseUrl: string, apiKey?: string) {
  await db().settings.put({ key: "aios", value: { baseUrl: baseUrl.replace(/\/$/, ""), apiKey } });
}

async function aiosFetch(path: string, init?: RequestInit) {
  const cfg = await getAIOSConfig();
  if (!cfg) throw new Error("AI OS not configured");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
  const r = await fetch(cfg.baseUrl + path, { ...init, headers });
  if (!r.ok) throw new Error(`AI OS ${path} → ${r.status}`);
  return r.json();
}

export async function startAIOSWorkflow(prompt: string): Promise<{ workflowId: string; runId: string } | null> {
  const cfg = await getAIOSConfig();
  if (!cfg) return null;
  try {
    const j = await aiosFetch("/v1/workflows/start", { method: "POST", body: JSON.stringify({ prompt }) });
    const workflowId = j.workflow_id || j.id || j.workflowId || uid();
    const runId = uid();
    const row: AgentRunRow = {
      id: runId,
      userId: LOCAL_USER_ID,
      workflowId,
      prompt,
      status: "running",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db().agentRuns.put(row);
    return { workflowId, runId };
  } catch (err) {
    console.warn("[lifehub] startAIOSWorkflow failed", err);
    return null;
  }
}

export async function pollAIOSWorkflow(runId: string) {
  const run = await db().agentRuns.get(runId);
  if (!run) return;
  if (run.status !== "running") return;
  try {
    const j = await aiosFetch(`/v1/workflows/${encodeURIComponent(run.workflowId)}`);
    const status = (j.status || "unknown").toLowerCase();
    const finished = ["completed", "failed", "error", "done", "success"].includes(status);
    const mapped: AgentRunRow["status"] = finished ? (status === "failed" || status === "error" ? "failed" : "completed") : "running";
    await db().agentRuns.update(runId, {
      status: mapped,
      resultText: j.output || j.result || j.message,
      updatedAt: Date.now(),
    });
  } catch (err) {
    // network blip; leave row as-is
  }
}

export async function getAIOSAccounting(): Promise<{ total?: number; runs?: number; raw?: any } | null> {
  const cfg = await getAIOSConfig();
  if (!cfg) return null;
  try {
    const j = await aiosFetch("/v1/accounting");
    return { total: j.total_cost_usd, runs: j.runs, raw: j };
  } catch {
    return null;
  }
}
