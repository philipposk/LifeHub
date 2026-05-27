"use client";
import { useRef, useState } from "react";
import { db, uid, LOCAL_USER_ID } from "@/lib/db/schema";
import { addCapture, addTask, addNote } from "@/lib/db/hooks";
import { classify } from "@/lib/capture/classify";
import { ingestPhoto } from "@/lib/capture/ocr";
import { startRecording, ingestVoice, VoiceSession } from "@/lib/capture/voice";
import { startAIOSWorkflow } from "@/lib/integrations/aios";
import { createAppMakerApp } from "@/lib/integrations/appmaker";
import { IconCamera, IconMic, IconPaperclip, IconHash } from "./icons";

export function QuickCapture() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<VoiceSession | null>(null);
  const [recording, setRecording] = useState(false);

  const submit = async () => {
    const v = text.trim();
    if (!v) return;
    setSaving(true);
    setStatus("");
    try {
      // Slash commands → integrations
      if (v.startsWith("/app ")) {
        const prompt = v.slice(5).trim();
        setStatus("Sending to AppMaker…");
        const out = await createAppMakerApp(prompt);
        if (out?.url) {
          await addCapture(`App scaffolded: ${out.url}`, "link", ["appmaker"]);
        } else {
          await addCapture(`/app ${prompt} — (not configured; set AppMaker URL in Settings)`, "text", ["appmaker"]);
        }
        setText("");
        setStatus("Done.");
        setTimeout(() => setStatus(""), 2000);
        return;
      }
      // /vault <type> <title> — body lines below first line
      // e.g.  /vault prompt RAG eval v2
      //       <body...>
      const vaultMatch = v.match(/^\/vault(?:\s+(\w+))?(?:\s+(.+))?/);
      if (vaultMatch) {
        const type = (vaultMatch[1] || "idea").toLowerCase();
        const firstLine = vaultMatch[2] || "";
        const restLines = v.split("\n").slice(1).join("\n").trim();
        const title = firstLine || (restLines.split("\n")[0] || "").slice(0, 60) || "untitled";
        setStatus("Writing to vault…");
        try {
          const r = await fetch("/api/vault/new", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type, title, body: restLines || firstLine }),
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            setStatus("Vault save failed: " + (j.error || r.status));
          } else {
            const j = await r.json();
            await addCapture(`Vault: ${j.path}`, "text", ["vault", type]);
            setStatus("Saved to vault: " + j.path);
          }
        } catch (err: any) {
          setStatus("Vault error: " + (err?.message || "unknown"));
        }
        setText("");
        setTimeout(() => setStatus(""), 3000);
        return;
      }

      if (v.startsWith("/agent ") || v.startsWith("/aios ")) {
        const prompt = v.replace(/^\/(agent|aios)\s+/, "").trim();
        setStatus("Sending to AI OS…");
        const out = await startAIOSWorkflow(prompt);
        if (out?.workflowId) {
          setStatus("Workflow started: " + out.workflowId);
        } else {
          await addCapture(`/agent ${prompt} — (not configured; set AI OS URL in Settings)`, "text", ["aios"]);
          setStatus("Not configured.");
        }
        setText("");
        setTimeout(() => setStatus(""), 3000);
        return;
      }

      const c = await classify(v);
      if (c.kind === "task") {
        await addTask(c.text, "today", c.chipCls, c.chipLabel);
      } else if (c.kind === "note") {
        await addNote(c.title, c.body, c.tag);
      } else {
        // capture (text or link)
        if (c.subKind === "link") {
          try {
            const r = await fetch("/api/unfurl?url=" + encodeURIComponent(c.body));
            if (r.ok) {
              const meta = await r.json();
              await db().captures.add({
                id: uid(),
                userId: LOCAL_USER_ID,
                kind: "link",
                body: meta.title ? `${meta.title} — ${meta.siteName || ""}` : c.body,
                tags: ["link", ...(c.tags || [])],
                processed: false,
                createdAt: Date.now(),
              });
            } else {
              await addCapture(c.body, "link", c.tags);
            }
          } catch {
            await addCapture(c.body, "link", c.tags);
          }
        } else {
          await addCapture(c.body, "text", c.tags);
        }
      }
      setText("");
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSaving(true);
    setStatus("Running OCR…");
    try {
      await ingestPhoto(f, (p) => setStatus(`OCR ${Math.round(p * 100)}%`));
      setStatus("Saved.");
    } catch (err: any) {
      setStatus("OCR failed: " + (err?.message || "unknown"));
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(""), 2500);
    }
  };

  const toggleVoice = async () => {
    if (recording) {
      setRecording(false);
      setStatus("Saving voice…");
      try {
        const { blob, transcript } = await voiceRef.current!.stop();
        await ingestVoice(blob, transcript);
        setStatus("Saved.");
      } catch (err: any) {
        setStatus("Voice failed: " + (err?.message || "unknown"));
      } finally {
        voiceRef.current = null;
        setTimeout(() => setStatus(""), 2500);
      }
    } else {
      try {
        voiceRef.current = await startRecording();
        setRecording(true);
        setStatus("Recording… click again to stop");
      } catch (err: any) {
        setStatus("Mic permission denied.");
        setTimeout(() => setStatus(""), 2500);
      }
    }
  };

  return (
    <div className="capture">
      <div className="capture-hd">
        <span className="pulse" /> Quick capture · stored locally · {status || "try `task: x`, `note: y`, `/vault prompt z`, `/agent w`, `/app v`, or paste a URL"}
      </div>
      <textarea
        className="capture-input"
        rows={2}
        placeholder="Jot a note, paste a link, or scan a receipt…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
      />
      <div className="capture-foot">
        <div className="capture-tools">
          <button className="tool-btn" onClick={() => fileRef.current?.click()} title="Photo OCR"><IconCamera /> Photo</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          <button className={"tool-btn" + (recording ? " on" : "")} onClick={toggleVoice} title="Voice memo">
            <IconMic /> {recording ? "Stop" : "Voice"}
          </button>
          <button className="tool-btn" title="File (coming)"><IconPaperclip /> File</button>
          <button className="tool-btn" title="Use #tag in text"><IconHash /> Tag</button>
        </div>
        <button className="btn-primary" onClick={submit} disabled={saving || !text.trim()}>
          {saving ? "Saving…" : "Save"} <span className="kbd">↵</span>
        </button>
      </div>
    </div>
  );
}
