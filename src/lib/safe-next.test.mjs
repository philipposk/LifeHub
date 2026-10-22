// Unit tests run with plain `node --test` (see cookies.test.mjs for the conventions).
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.mjs";

const FALLBACK = "/today";

test("keeps same-site paths", () => {
  assert.equal(safeNext("/", FALLBACK), "/");
  assert.equal(safeNext("/today", FALLBACK), "/today");
  assert.equal(safeNext("/profile/edit", FALLBACK), "/profile/edit");
});

test("keeps query strings and hashes on same-site paths", () => {
  assert.equal(safeNext("/chat/42?tab=matches", FALLBACK), "/chat/42?tab=matches");
  assert.equal(safeNext("/help#faq", FALLBACK), "/help#faq");
});

test("keeps harmless encoded characters", () => {
  assert.equal(safeNext("/search?q=hello%20world", FALLBACK), "/search?q=hello%20world");
});

test("keeps a path that merely contains a URL in the query", () => {
  assert.equal(safeNext("/out?to=https://example.com", FALLBACK), "/out?to=https://example.com");
});

test("blocks protocol-relative //evil", () => {
  assert.equal(safeNext("//evil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("///evil.example", FALLBACK), FALLBACK);
});

test("blocks backslash tricks /\\evil", () => {
  assert.equal(safeNext("/\\evil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("/ok\\evil.example", FALLBACK), FALLBACK);
});

test("blocks absolute URLs", () => {
  assert.equal(safeNext("https://evil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("http://evil.example/path", FALLBACK), FALLBACK);
});

test("blocks javascript: and data: schemes", () => {
  assert.equal(safeNext("javascript:alert(1)", FALLBACK), FALLBACK);
  assert.equal(safeNext("data:text/html,<script>alert(1)</script>", FALLBACK), FALLBACK);
});

test("blocks values that do not start with a slash", () => {
  assert.equal(safeNext("discover", FALLBACK), FALLBACK);
  assert.equal(safeNext("@evil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext(" /discover", FALLBACK), FALLBACK);
});

test("blocks encoded //evil after one decode", () => {
  assert.equal(safeNext("%2F%2Fevil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("/%2Fevil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("/%2f%2fevil.example", FALLBACK), FALLBACK);
});

test("blocks encoded backslash after one decode", () => {
  assert.equal(safeNext("/%5Cevil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("/%5cevil.example", FALLBACK), FALLBACK);
});

test("blocks control characters, raw and encoded", () => {
  assert.equal(safeNext("/\t/evil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("/\n/evil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("/%09/evil.example", FALLBACK), FALLBACK);
  assert.equal(safeNext("/%0d%0aSet-Cookie:x=1", FALLBACK), FALLBACK);
  assert.equal(safeNext("/ok\u0000", FALLBACK), FALLBACK);
});

test("blocks malformed percent-escapes", () => {
  assert.equal(safeNext("/%E0%A4%A", FALLBACK), FALLBACK);
  assert.equal(safeNext("/100%", FALLBACK), FALLBACK);
});

test("returns the fallback for empty, null, undefined and non-strings", () => {
  assert.equal(safeNext("", FALLBACK), FALLBACK);
  assert.equal(safeNext(null, FALLBACK), FALLBACK);
  assert.equal(safeNext(undefined, FALLBACK), FALLBACK);
  assert.equal(safeNext(42, FALLBACK), FALLBACK);
  assert.equal(safeNext({}, FALLBACK), FALLBACK);
});

test("fallback defaults to /", () => {
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext(null), "/");
});

test("blocks very long values", () => {
  assert.equal(safeNext("/" + "a".repeat(2100), FALLBACK), FALLBACK);
});

test("never loops back to the sign-in page", () => {
  assert.equal(safeNext("/sign-in", FALLBACK), FALLBACK);
  assert.equal(safeNext("/sign-in?next=/discover", FALLBACK), FALLBACK);
  assert.equal(safeNext("/sign-in/extra", FALLBACK), FALLBACK);
  assert.equal(safeNext("/sign-in-help", FALLBACK), "/sign-in-help");
});
