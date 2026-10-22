"use client";
import { useEffect } from "react";
import { db } from "./db/schema";
import { useLiveQuery } from "dexie-react-hooks";

export type ThemeMode = "light" | "dark" | "auto";

export type Tweaks = {
  accent: string;
  density: "compact" | "regular" | "comfy";
  /** Legacy on/off; kept so old saved rows still read. `mode` wins when present. */
  dark: boolean;
  mode?: ThemeMode;
  /** False until the saved row has loaded; the pre-paint script owns the look until then. */
  loaded?: boolean;
};

export const DEFAULT_TWEAKS: Tweaks = {
  accent: "#5C6B4A",
  density: "regular",
  dark: true,
};

/** Saved rows from before Light/Dark/Auto keep the mode they had; new users get Auto. */
export function modeOf(t: Partial<Tweaks> | undefined | null): ThemeMode {
  if (t?.mode === "light" || t?.mode === "dark" || t?.mode === "auto") return t.mode;
  if (t && typeof t.dark === "boolean") return t.dark ? "dark" : "light";
  return "auto";
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "auto") return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return mode === "dark";
}

export { BOOT_KEY } from "./theme-boot";
import { BOOT_KEY } from "./theme-boot";

export function useTweaksLive(): [Tweaks, (key: keyof Tweaks, value: any) => Promise<void>] {
  const row = useLiveQuery(async () => (await db().settings.get("tweaks"))?.value as Tweaks | undefined, []);
  const t: Tweaks = { ...DEFAULT_TWEAKS, ...(row || {}), mode: modeOf(row), loaded: row !== undefined };
  const set = async (key: keyof Tweaks, value: any) => {
    const { loaded: _loaded, ...rest } = t;
    void _loaded;
    const next: Tweaks = { ...rest, [key]: value };
    if (key === "dark") next.mode = value ? "dark" : "light";
    await db().settings.put({ key: "tweaks", value: next });
  };
  return [t, set];
}

export function useApplyTweaks(t: Tweaks) {
  const mode = modeOf(t);
  const loaded = t.loaded !== false;
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const apply = () => root.setAttribute("data-theme", resolveDark(mode) ? "dark" : "light");
    root.style.setProperty("--accent", t.accent);
    root.setAttribute("data-density", t.density);
    apply();
    try { localStorage.setItem(BOOT_KEY, JSON.stringify({ mode, accent: t.accent, density: t.density })); } catch {}
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [loaded, t.accent, mode, t.density]);
}

export function ModeSegments({ mode, onChange }: { mode: ThemeMode; onChange: (m: ThemeMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Theme" className="swatch-row">
      {(["light", "dark", "auto"] as ThemeMode[]).map((m) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m}
          className={"btn" + (mode === m ? " btn-primary" : "")} onClick={() => onChange(m)}>
          {m === "light" ? "Light" : m === "dark" ? "Dark" : "Auto"}
        </button>
      ))}
    </div>
  );
}
