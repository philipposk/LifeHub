// Local-date helpers. IMPORTANT: habit logs, streaks, and the seed all key by
// "YYYY-MM-DD". Using toISOString() keys by UTC, which is the wrong calendar day
// for any user east/west of UTC during the evening/early-morning hours (e.g.
// Greece is UTC+2/+3, so 01:30 local = previous UTC day → habit logged "today"
// would land on yesterday's cell). These helpers key by the user's LOCAL day so
// the dashboard matches the wall clock.

/** "YYYY-MM-DD" for the given Date in the user's local timezone. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local date key for N days before today. */
export function localDateKeyDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateKey(d);
}
