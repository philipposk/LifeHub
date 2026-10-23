"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ensureSeeded } from "@/lib/db/seed";
import { startSyncLoop } from "@/lib/sync/adapter";
import { pullActorRecords } from "@/lib/sync/pull";
import { createClient } from "@/lib/supabase/client";
import { clearSignedOutLocally, db, isSampleActor, SAMPLE_USER_ID, setActorId, subscribeActor, wasSignedOutLocally } from "@/lib/db/schema";
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
  const [sample, setSample] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setSample(isSampleActor());
    return subscribeActor((id) => setSample(isSampleActor(id)));
  }, [ready]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    (async () => {
      try {
        await ensureSeeded();
      } catch (e) {
        console.error("[lifehub] seed error", e);
      }
      if (cancelled) return;
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user && !wasSignedOutLocally()) {
          setActorId(user.id);
          const existing = await db().users.get(user.id);
          if (!existing) {
            await db().users.put({
              id: user.id,
              name: user.email?.split("@")[0] || "You",
              email: user.email ?? undefined,
              createdAt: Date.now(),
            });
          }
          await pullActorRecords(user.id);
        } else {
          setActorId(SAMPLE_USER_ID);
        }
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN") clearSignedOutLocally();
          if (wasSignedOutLocally() && event !== "SIGNED_IN") {
            setActorId(SAMPLE_USER_ID);
            return;
          }
          if (session?.user) {
            setActorId(session.user.id);
            void pullActorRecords(session.user.id);
          } else {
            setActorId(SAMPLE_USER_ID);
          }
        });
        stop = () => data.subscription.unsubscribe();
      }
      if (!cancelled) {
        setReady(true);
        startSyncLoop();
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
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

  // The home page is the public landing: render it straight away (server
  // HTML that search engines can read), without the app chrome or loader.
  if (pathname === "/") return <>{children}</>;

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
          {sample && (
            <div className="sample-banner">
              Sample workspace. The people and tasks on this screen are examples, not your data.
              <Link href="/sign-in">Sign in</Link>
              for an empty workspace of your own.
            </div>
          )}
          <div className="content">{children}</div>
        </div>
        <TweaksPanel />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </ToastProvider>
  );
}
