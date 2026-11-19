const isProd = process.env.NODE_ENV === "production";

export const sharedCookieOptions = {
  name: "sb-6x7-auth",
  ...(isProd ? { domain: ".6x7.gr" } : {}),
  sameSite: "lax" as const,
  secure: isProd,
  path: "/",
};

/** Cookie domain for the host being served: `.6x7.dk` on the .dk mirror, `.6x7.gr` everywhere else (unchanged). */
export function cookieOptionsForHost(host?: string | null) {
  if (!isProd) return sharedCookieOptions;
  const h = (host ?? "").split(":")[0].toLowerCase();
  const domain = h === "6x7.dk" || h.endsWith(".6x7.dk") ? ".6x7.dk" : ".6x7.gr";
  return { ...sharedCookieOptions, domain };
}

export function hostFromHeaders(h: { get(name: string): string | null }): string | null {
  return h.get("x-forwarded-host") ?? h.get("host");
}
