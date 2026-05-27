"use client";
import { useEffect } from "react";
import { db } from "./db/schema";
import { useLiveQuery } from "dexie-react-hooks";

export type Tweaks = {
  accent: string;
  density: "compact" | "regular" | "comfy";
  dark: boolean;
};

export const DEFAULT_TWEAKS: Tweaks = {
  accent: "#5C6B4A",
  density: "regular",
  dark: true,
};

export function useTweaksLive(): [Tweaks, (key: keyof Tweaks, value: any) => Promise<void>] {
  const row = useLiveQuery(async () => (await db().settings.get("tweaks"))?.value as Tweaks | undefined, []);
  const t: Tweaks = { ...DEFAULT_TWEAKS, ...(row || {}) };
  const set = async (key: keyof Tweaks, value: any) => {
    await db().settings.put({ key: "tweaks", value: { ...t, [key]: value } });
  };
  return [t, set];
}

export function useApplyTweaks(t: Tweaks) {
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
    document.body.setAttribute("data-theme", t.dark ? "dark" : "light");
    document.body.setAttribute("data-density", t.density);
  }, [t.accent, t.dark, t.density]);
}
