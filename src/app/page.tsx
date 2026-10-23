import type { Metadata } from "next";
import Link from "next/link";
import { SignedInRedirect } from "@/components/SignedInRedirect";

// Public landing. Everything else in LifeHub is your private workspace and is
// marked noindex (see vercel.json); this page is what search engines index.

export const metadata: Metadata = { alternates: { canonical: "/" } };

const FEATURES = [
  { title: "Today", body: "One screen with what's due, what you captured and the habits you're keeping." },
  { title: "Tasks and areas", body: "Organise work and life into areas, with tags, due dates and quick keyboard capture." },
  { title: "Notes and captures", body: "Jot ideas, save links and keep notes next to the tasks they belong to." },
  { title: "Habits and calendar", body: "Track daily habits and see your week on a simple calendar." },
  { title: "Offline first", body: "Your workspace lives on your device and syncs across devices when you sign in." },
  { title: "Keyboard friendly", body: "Press / or Ctrl+K to search everything, ? for all shortcuts." },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "LifeHub",
  url: "https://lifehub.6x7.gr/",
  description:
    "A personal dashboard that keeps your tasks, notes, captures, habits and calendar in one calm place.",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
};

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <SignedInRedirect to="/today" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "72px 24px 96px" }}>
        <p style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 16 }}>
          LifeHub
        </p>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(40px, 7vw, 64px)", lineHeight: 1.05, margin: "0 0 20px" }}>
          Your tasks, notes and habits in one calm place.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ink-2, var(--ink))", maxWidth: 600, marginBottom: 32 }}>
          LifeHub is a personal dashboard for the things you keep track of every day. It works offline, and syncs
          across your devices when you sign in.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/today" style={{ textDecoration: "none", padding: "12px 20px", borderRadius: 999, background: "var(--ink)", color: "var(--bg)", fontWeight: 500 }}>
            Try the sample workspace →
          </Link>
          <Link href="/sign-in" style={{ textDecoration: "none", padding: "12px 20px", borderRadius: 999, border: "1px solid var(--line)", color: "var(--ink)" }}>
            Sign in
          </Link>
        </div>

        <h2 style={{ fontSize: 22, margin: "56px 0 16px" }}>What&rsquo;s inside</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {FEATURES.map((f) => (
            <li key={f.title} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--muted)", margin: 0 }}>{f.body}</p>
            </li>
          ))}
        </ul>

        <p style={{ textAlign: "center", marginTop: 48, fontSize: 13 }}>
          <a href="https://6x7.gr" style={{ color: "var(--muted)" }}>More projects at 6x7.gr</a>
        </p>
      </div>
    </main>
  );
}
