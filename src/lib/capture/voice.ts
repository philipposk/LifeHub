"use client";
import { db, uid, LOCAL_USER_ID } from "../db/schema";
import { saveBlob } from "./ocr";

export type VoiceSession = {
  stop: () => Promise<{ blob: Blob; transcript: string }>;
};

export async function startRecording(): Promise<VoiceSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks: BlobPart[] = [];
  const mr = new MediaRecorder(stream);
  mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  mr.start();

  // Concurrent Web Speech API transcription (free path).
  let transcript = "";
  let recog: any = null;
  const SR: any = (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  if (SR) {
    recog = new SR();
    recog.continuous = true;
    recog.interimResults = false;
    recog.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcript += (transcript ? " " : "") + e.results[i][0].transcript;
      }
    };
    try { recog.start(); } catch { /* already started */ }
  }

  return {
    stop: () =>
      new Promise<{ blob: Blob; transcript: string }>((resolve) => {
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          try { recog?.stop(); } catch {}
          const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
          resolve({ blob, transcript });
        };
        mr.stop();
      }),
  };
}

export async function whisperTranscribe(blob: Blob): Promise<string | null> {
  const cfg = (await db().settings.get("openai"))?.value as { key?: string } | undefined;
  if (!cfg?.key) return null;
  try {
    const fd = new FormData();
    fd.append("file", new File([blob], "audio.webm", { type: blob.type || "audio/webm" }));
    fd.append("model", "whisper-1");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.key}` },
      body: fd,
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.text || null;
  } catch (err) {
    console.warn("[lifehub] whisper failed", err);
    return null;
  }
}

export async function ingestVoice(blob: Blob, fallbackTranscript: string) {
  const blobRef = await saveBlob(blob);
  let transcript = fallbackTranscript;
  const whisper = await whisperTranscribe(blob);
  if (whisper && whisper.length > transcript.length) transcript = whisper;
  await db().captures.add({
    id: uid(),
    userId: LOCAL_USER_ID,
    kind: "voice",
    body: transcript.slice(0, 280) || "(voice memo)",
    blobRef,
    transcript,
    tags: ["voice"],
    processed: false,
    createdAt: Date.now(),
  });
}
