// Plain JavaScript on purpose: `npm test` loads this file directly, without a build step.

/** Same-site relative path check on one string (raw or decoded). */
function isSameSitePath(path) {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  // Backslashes: browsers read "/\evil.example" as "//evil.example".
  if (path.includes("\\")) return false;
  // Browsers drop tabs and newlines inside URLs, so "/\t/evil.example" would turn into "//evil.example".
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  // Never send people back to the sign-in page itself.
  if (path === "/sign-in" || path.startsWith("/sign-in?") || path.startsWith("/sign-in/") || path.startsWith("/sign-in#")) {
    return false;
  }
  return true;
}

/**
 * Where to send someone after sign-in. Only paths on this same site are allowed, so a crafted link like
 * `?next=//evil.example`, `?next=/\evil.example` or `?next=https://evil.example` cannot bounce a signed-in
 * visitor to another site. The value is also decoded once and re-checked, so `/%2Fevil.example` and
 * `/%5Cevil.example` are caught too. Returns the original value when safe, otherwise `fallback`.
 * @param {string | null | undefined} next
 * @param {string} [fallback]
 */
export function safeNext(next, fallback = "/") {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
  if (!isSameSitePath(next)) return fallback;
  let decoded;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback; // malformed %-escape
  }
  if (!isSameSitePath(decoded)) return fallback;
  return next;
}
