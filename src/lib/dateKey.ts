/**
 * Local-date helpers.
 *
 * IMPORTANT: never derive a calendar day with `date.toISOString().slice(0, 10)`.
 * `toISOString()` converts to UTC first, so for any UTC+ timezone (e.g. UK during
 * BST) local midnight becomes the previous day and day-keyed data lands on the
 * wrong date. Always bucket by the viewer's *local* day using these helpers.
 */

/** Returns the local calendar day of `d` as a `yyyy-MM-dd` string. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parses a `yyyy-MM-dd` string as a local date (midnight local time). */
export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Local date key for `n` days from `base` (negative = past). */
export function localDateKeyOffset(n: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return localDateKey(d);
}

/** Local date key for the day a timestamp/ISO string falls on, in the viewer's timezone. */
export function localDateKeyFromTimestamp(ts: string | number | Date): string {
  return localDateKey(new Date(ts));
}
