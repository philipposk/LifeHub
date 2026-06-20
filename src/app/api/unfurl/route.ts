import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pick = (html: string, re: RegExp): string | undefined => {
  const m = html.match(re);
  return m?.[1]?.trim();
};

// ── SSRF guard ────────────────────────────────────────────────────────────
// Block requests that resolve to private / loopback / link-local space so a
// pasted (or redirecting) URL can't be used to probe internal services or the
// cloud metadata endpoint (169.254.169.254).
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;        // link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}
function isPrivateIPv6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === "::1" || x === "::") return true;
  if (x.startsWith("fc") || x.startsWith("fd")) return true; // unique-local
  if (x.startsWith("fe80")) return true;                      // link-local
  if (x.startsWith("::ffff:")) return isPrivateIPv4(x.slice(7)); // mapped v4
  return false;
}
async function hostIsSafe(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (net.isIP(h)) return net.isIPv6(h) ? !isPrivateIPv6(h) : !isPrivateIPv4(h);
  let records: { address: string }[];
  try {
    records = await dns.lookup(h, { all: true });
  } catch {
    return false;
  }
  if (records.length === 0) return false;
  return records.every(r =>
    net.isIPv6(r.address) ? !isPrivateIPv6(r.address) : !isPrivateIPv4(r.address)
  );
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
  let target: URL;
  try { target = new URL(url); } catch { return NextResponse.json({ error: "bad url" }, { status: 400 }); }
  if (!/^https?:$/.test(target.protocol)) {
    return NextResponse.json({ error: "only http/https" }, { status: 400 });
  }

  // Follow redirects manually, validating each hop against the SSRF guard.
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 6000);
  try {
    let current = target;
    let res: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      if (!(await hostIsSafe(current.hostname))) {
        return NextResponse.json({ error: "blocked: private or unresolved host" }, { status: 400 });
      }
      res = await fetch(current.toString(), {
        headers: { "User-Agent": "LifeHub/0.4 (+unfurl)", Accept: "text/html,*/*" },
        signal: ctrl.signal,
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        const next = new URL(res.headers.get("location")!, current);
        if (!/^https?:$/.test(next.protocol)) {
          return NextResponse.json({ error: "blocked: non-http redirect" }, { status: 400 });
        }
        current = next;
        continue;
      }
      break;
    }
    if (!res) return NextResponse.json({ error: "no response" }, { status: 502 });

    const html = (await res.text()).slice(0, 200_000);
    const title =
      pick(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      pick(html, /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
      pick(html, /<title[^>]*>([^<]+)<\/title>/i);
    const description =
      pick(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      pick(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const image =
      pick(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const siteName =
      pick(html, /<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) || current.hostname;
    return NextResponse.json({ url: current.toString(), title, description, image, siteName });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }
}
