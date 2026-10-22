import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next.mjs";

export const metadata: Metadata = { title: "Sign in · LifeHub", robots: { index: false, follow: false } };

const LINK_TYPES = ["magiclink", "signup", "invite", "email", "email_change"];

type Props = { searchParams: { token_hash?: string; type?: string; next?: string } };

/**
 * Landing page for emailed links built from a Supabase `token_hash`. Opening it does nothing by itself:
 * the one-time token is only spent when the person taps the button (a same-origin POST to /auth/verify).
 * That stops mail scanners from burning links, and stops a crafted GET link from signing a visitor into
 * someone else's account. (Supabase's own `{{ .ConfirmationURL }}` links go to /auth/callback instead.)
 */
export default function ConfirmPage({ searchParams }: Props) {
  const sp = searchParams;
  const tokenHash = typeof sp.token_hash === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(sp.token_hash) ? sp.token_hash : null;
  const type = typeof sp.type === "string" && LINK_TYPES.includes(sp.type) ? sp.type : "magiclink";
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/today");

  return (
    <div className="auth-card" style={{ textAlign: "center" }}>
      <h1>LifeHub</h1>
      {tokenHash ? (
        <form action="/auth/verify" method="post">
          <p>Tap the button to finish signing in.</p>
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn-primary">Sign in to LifeHub</button>
        </form>
      ) : (
        <div>
          <p>This sign-in link is incomplete or has expired.</p>
          <Link href="/sign-in" className="btn-primary">Get a new link</Link>
        </div>
      )}
    </div>
  );
}
