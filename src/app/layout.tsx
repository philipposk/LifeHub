import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { THEME_BOOT } from "@/lib/theme-boot";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://lifehub.6x7.gr").replace(/\/$/, "");
const DESCRIPTION =
  "LifeHub is a personal dashboard that keeps your tasks, notes, captures, habits and calendar in one calm place. Works offline, syncs when you sign in.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "LifeHub — tasks, notes, habits and captures in one place", template: "%s · LifeHub" },
  description: DESCRIPTION,
  applicationName: "LifeHub",
  openGraph: {
    type: "website",
    siteName: "LifeHub",
    title: "LifeHub — tasks, notes, habits and captures in one place",
    description: DESCRIPTION,
  },
  twitter: { card: "summary" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Saved Light / Dark / Auto and accent before first paint: no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
