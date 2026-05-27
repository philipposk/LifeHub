"use client";
import { db, uid, LOCAL_USER_ID } from "../db/schema";

export async function saveBlob(blob: Blob): Promise<string> {
  const id = uid();
  await db().blobs.put({ id, mime: blob.type || "application/octet-stream", blob, createdAt: Date.now() });
  return id;
}

export async function getBlobUrl(blobRef: string): Promise<string | null> {
  const row = await db().blobs.get(blobRef);
  if (!row) return null;
  return URL.createObjectURL(row.blob);
}

export async function ocrPhoto(blob: Blob, onProgress?: (p: number) => void): Promise<string> {
  // Lazy-load tesseract.js — keeps initial bundle small.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", undefined, {
    logger: (m: any) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(blob);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

export async function ingestPhoto(file: File, onProgress?: (p: number) => void) {
  const blobRef = await saveBlob(file);
  const text = await ocrPhoto(file, onProgress);
  await db().captures.add({
    id: uid(),
    userId: LOCAL_USER_ID,
    kind: "photo",
    body: text.slice(0, 280),
    blobRef,
    ocrText: text,
    tags: ["photo"],
    processed: false,
    createdAt: Date.now(),
  });
}
