import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next.mjs";

// No "recovery": there are no passwords to reset (sign-in is Google or an emailed link/code).
const OTP_TYPES: EmailOtpType[] = ["magiclink", "signup", "invite", "email", "email_change"];

/** Same-origin only: a cross-site form must not be able to sign a visitor into another account. */
function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return site === "same-origin";
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** POST from the /auth/confirm button: spend the one-time token and write the session to the shared cookie. */
export async function POST(req: Request) {
  const fail = NextResponse.redirect(new URL("/sign-in?error=auth", req.url), 303);
  if (!sameOrigin(req)) return fail;

  const form = await req.formData().catch(() => null);
  const field = (k: string) => {
    const v = form?.get(k);
    return typeof v === "string" ? v : null;
  };
  const tokenHash = field("token_hash");
  const type = field("type") as EmailOtpType | null;
  if (!tokenHash || !type || !OTP_TYPES.includes(type)) return fail;

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail;

  return NextResponse.redirect(new URL(safeNext(field("next"), "/today"), req.url), 303);
}
