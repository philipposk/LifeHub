"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeGmailCode } from "@/lib/integrations/email";

export default function GmailCallback() {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState("Finishing sign-in…");

  useEffect(() => {
    const code = search.get("code");
    const err = search.get("error");
    if (err) { setStatus("Google returned an error: " + err); return; }
    if (!code) { setStatus("No authorization code in URL."); return; }
    (async () => {
      const ok = await exchangeGmailCode(code);
      if (ok) {
        setStatus("Connected. Redirecting…");
        setTimeout(() => router.replace("/integrations/email"), 800);
      } else {
        setStatus("Token exchange failed. Check the client id/secret you saved.");
      }
    })();
  }, [router, search]);

  return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 36 }}>Email</div>
      <div style={{ marginTop: 12, color: "var(--muted)" }}>{status}</div>
    </div>
  );
}
