import { NextResponse } from "next/server";

/**
 * Returns a 501 response in production (Vercel) for routes that require
 * filesystem access or native Node modules (better-sqlite3) that are
 * unavailable in serverless. On localhost these routes work normally.
 */
export function prodGuard(feature: string): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;
  return NextResponse.json(
    {
      ok: false,
      error: "local-only-feature",
      feature,
      hint: `"${feature}" uses the local filesystem / native modules and is only available when LifeHub is running locally (npm run dev / npm start on your machine). On the hosted version this feature is unavailable.`,
    },
    { status: 501 }
  );
}
