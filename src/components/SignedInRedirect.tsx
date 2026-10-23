"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { wasSignedOutLocally } from "@/lib/db/schema";

// Signed-in people skip the landing and go straight to their workspace,
// like before. Logged-out visitors and crawlers stay on the landing.
export function SignedInRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled && data.session && !wasSignedOutLocally()) router.replace(to);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [router, to]);
  return null;
}
