// Polling cadences (API_CONTRACT.md §10) — constants, not configuration
// (CONFIGURATION.md §5). Tuned in one place; mirrored by both apps via the
// shared package so the two never drift. Values are milliseconds.

export const POLL_CADENCES_MS = {
  /** Area snapshot: ~60 s + on window refocus. */
  snapshot: 60_000,
  /** Ratings delta while a table/workspace is visible: ~20 s. */
  ratings: 20_000,
  /** Unread total badge, every screen: ~20 s. */
  unread: 20_000,
  /** Open chat thread delta while open: ~5–10 s. */
  openThread: 7_500,
  /** Calendar day progress while open: ~20 s. */
  calendarDay: 20_000,
} as const;

export type PollCadenceKey = keyof typeof POLL_CADENCES_MS;
