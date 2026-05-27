import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const pick = (html: string, re: RegExp): string | undefined => {
  const m = html.match(re);
  return m?.[1]?.trim();
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
  let target: URL;
  try { target = new URL(url); } catch { return NextResponse.json({ error: "bad url" }, { status: 400 }); }
  if (!/^https?:$/.test(target.protocol)) {
    return NextResponse.json({ error: "only http/https" }, { status: 400 });
  }
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": "LifeHub/0.4 (+unfurl)", Accept: "text/html,*/*" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(tid);
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
      pick(html, /<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) || target.hostname;
    return NextResponse.json({ url: target.toString(), title, description, image, siteName });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "fetch failed" }, { status: 502 });
  }
}
