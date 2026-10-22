"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { db, setActorId } from "@/lib/db/schema";
import { pullActorRecords } from "@/lib/sync/pull";
import { safeNext } from "@/lib/safe-next.mjs";

const RESEND_COOLDOWN_SECONDS = 60;
const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";
const NOT_CONFIGURED = "Sign-in is not configured on this server.";
const LINK_ERROR =
  "That sign-in link did not work. It may have expired or been used already, or been opened in a different browser. Ask for a new link.";
const CODE_ERROR = "That code did not work. It may have expired or been used already. Ask for a new link.";
const BUSY_ERROR = "Email sign-in is busy right now. Use Google, or try again in a few minutes.";

function isRateLimited(err: { status?: number; message?: string }): boolean {
  return err.status === 429 || /rate limit|only request this after/i.test(err.message ?? "");
}

const isConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Sign-in is passwordless: Google, or a one-time link + code emailed by Supabase.
 * Every *.6x7.gr app shares one auth store and one session cookie, so there is no password signup:
 * a password account made for someone else's email would open that person's account everywhere.
 * People who signed up with a password before keep the same account: the emailed link signs them in.
 */
function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/today");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(searchParams.get("error") ? LINK_ERROR : "");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastSentTo, setLastSentTo] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function redirectTo() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signInWithGoogle() {
    setError("");
    if (!isConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    setBusy(true);
    let message = "";
    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo() },
      });
      if (oauthError) message = oauthError.message;
    } catch {
      message = NETWORK_ERROR;
    }
    // On success the browser is already leaving for Google.
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  async function sendLink(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    if (!isConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    const address = email.trim();
    setBusy(true);
    let failure = "";
    try {
      const { error: otpError } = await createClient().auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: redirectTo() },
      });
      if (otpError) failure = isRateLimited(otpError) ? BUSY_ERROR : otpError.message;
    } catch {
      failure = NETWORK_ERROR;
    }
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    setCode("");
    setSent(true);
    setLastSentTo(address);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function finishSignIn() {
    const supabase = createClient();
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
    router.push(next);
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    let failure = "";
    try {
      const { error: verifyError } = await createClient().auth.verifyOtp({
        email: email.trim(),
        token: code.replace(/\s/g, ""),
        type: "email",
      });
      if (verifyError) failure = isRateLimited(verifyError) ? BUSY_ERROR : CODE_ERROR;
    } catch {
      failure = NETWORK_ERROR;
    }
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    try {
      await finishSignIn();
    } finally {
      setBusy(false);
    }
  }

  // Same address right after a send: wait out the cooldown (Supabase refuses a second email to one address within 60 s anyway).
  const resendBlocked = cooldown > 0 && email.trim() === lastSentTo;

  if (sent) {
    return (
      <div className="auth-card">
        <h1>Check your email</h1>
        <p>
          We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device, or type the code from the email
          below. Check your spam folder too.
        </p>
        <form onSubmit={verifyCode}>
          <label htmlFor="code">Code from the email</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="8-digit code"
            required
            minLength={6}
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Working…" : "Sign in with code"}
          </button>
        </form>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <p className="auth-note">The link and the code are one-time: once you open the link, the code stops working.</p>
        <div className="auth-switch auth-switch-row">
          <button type="button" onClick={() => { setSent(false); setError(""); }}>Use a different email</button>
          <button type="button" disabled={busy || resendBlocked} onClick={() => void sendLink()}>
            {resendBlocked ? `Send a new link (${cooldown}s)` : "Send a new link"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Sign in</h1>
      <p>Your workspace starts empty. Sample people stay on the signed-out screen.</p>
      <button className="btn-secondary" type="button" disabled={busy} onClick={() => void signInWithGoogle()}>
        Continue with Google
      </button>
      <div className="auth-divider"><span>or</span></div>
      <form onSubmit={sendLink}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-primary" type="submit" disabled={busy || resendBlocked}>
          {busy ? "Working…" : resendBlocked ? `Email me a sign-in link (${cooldown}s)` : "Email me a sign-in link"}
        </button>
      </form>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <p className="auth-note">
        No password needed. New here? The link creates your account. Used a password before? Same email, same account.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
