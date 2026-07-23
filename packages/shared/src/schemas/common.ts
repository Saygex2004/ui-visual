// Shared Zod primitives used across schemas.
import { z } from 'zod';

/**
 * Calendar date (a day, no time-of-day) — `YYYY-MM-DD` (DATA_MODEL.md §2).
 * Validated by shape, not by calendar correctness (the scraper's values are
 * authoritative); we only guard the format the sorting/band rules rely on.
 */
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

/**
 * Instant. DATA_MODEL.md §2 stores native Firestore timestamps; the API
 * (API_CONTRACT.md §1) exposes ISO-8601 UTC strings, and the JSON fixtures use
 * ISO strings. The repository layer (Phase 2) maps Firestore Timestamp → ISO.
 * We accept an ISO string, a Date, or a Firestore-Timestamp-like object and
 * normalize to an ISO string so downstream code has one representation.
 */
export const instant = z
  .union([
    z.string(),
    z.date(),
    z.object({ seconds: z.number(), nanoseconds: z.number().optional() }),
    z.object({ _seconds: z.number(), _nanoseconds: z.number().optional() }),
  ])
  .transform((v): string => {
    if (typeof v === 'string') return v;
    if (v instanceof Date) return v.toISOString();
    const seconds = 'seconds' in v ? v.seconds : v._seconds;
    return new Date(seconds * 1000).toISOString();
  });

/** `content_hash` is scraper bookkeeping — present but opaque, never interpreted. */
export const opaqueString = z.string();
