"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { db, setActorId } from "@/lib/db/schema";
import { pullActorRecords } from "@/lib/sync/pull";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Sign-in is not configured on this server.");
      setBusy(false);
      return;
    }
    const supabase = createClient();
    if (mode === "up") {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        setBusy(false);
        return;
      }
      if (!data.session) {
        setInfo("Check your email to confirm the account, then sign in.");
        setBusy(false);
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setBusy(false);
        return;
      }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
    }
    setBusy(false);
    router.push("/today");
  }

  return (
    <form className="auth-card" onSubmit={onSubmit}>
      <h1>{mode === "in" ? "Sign in" : "Create account"}</h1>
      <p>Your workspace starts empty. Sample people stay on the signed-out screen.</p>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
      {error && <div className="auth-error">{error}</div>}
      {info && <div className="auth-error" style={{ color: "var(--ink-2)" }}>{info}</div>}
      <div className="auth-switch">
        {mode === "in" ? "No account yet?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); setInfo(null); }}>
          {mode === "in" ? "Create one" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
