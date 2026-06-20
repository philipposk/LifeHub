"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ensureSeeded } from "@/lib/db/seed";
import { startSyncLoop } from "@/lib/sync/adapter";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { TweaksPanel } from "./TweaksPanel";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { ToastProvider } from "./Toast";

const isEditable = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
};

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    ensureSeeded()
      .catch((e) => console.error("[lifehub] seed error", e))
      .finally(() => {
        setReady(true);
        startSyncLoop();
      });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
        setHelpOpen(false);
      } else if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault();
        router.push("/tasks");
      } else if (e.key === "/" && !isEditable(e.target)) {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "?" && !isEditable(e.target)) {
        e.preventDefault();
        setHelpOpen(h => !h);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "var(--muted)" }}>
        Loading LifeHub…
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className={"app" + (navOpen ? " nav-open" : "")}>
        <Sidebar />
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
        <div className="main">
          <Topbar onOpenSearch={() => setPaletteOpen(true)} onToggleNav={() => setNavOpen(o => !o)} />
          <div className="content">{children}</div>
        </div>
        <TweaksPanel />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </ToastProvider>
  );
}
