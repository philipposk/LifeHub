import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://lifehub.6x7.gr").replace(/\/$/, "");

// Only the landing is public; the workspace pages are personal (and noindex).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/integrations/", "/vault", "/settings"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
