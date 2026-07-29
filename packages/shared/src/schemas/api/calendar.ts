// API — calendar bodies (API_CONTRACT.md §7).
import { z } from 'zod';
import { calendarDate } from '../common.js';
import { AREA_SLUGS } from '../../constants/areas.js';

export const MonthDaySchema = z.object({
  date: calendarDate,
  assigned: z.number().int(),
  completed: z.number().int(),
  actionable: z.boolean(),
});

export const MonthResponseSchema = z.object({ days: z.array(MonthDaySchema) });

/** A day can mix immobili + corporate rows — admin by-id assignment is the
 *  only path corporate listings enter a calendar by (UI §8.3.3) — so every
 *  row must carry its own area for the workspace/quick-chat link to route
 *  correctly; there is no single table-wide area the way an area-view table
 *  has one. */
export const CalendarRowSchema = z.object({
  id: z.string(),
  area: z.enum(AREA_SLUGS),
  tipo_bene: z.string().nullable(),
  tipo_procedura: z.string().nullable(),
  blocco_key: z.string().nullable(),
  tribunale: z.string().nullable(),
  regione: z.string().nullable(),
  provincia: z.string().nullable(),
  comune: z.string().nullable(),
  disponibilita: z.string(),
  valore_richiesto: z.number().nullable(),
  data_vendita: z.string().nullable(),
  link: z.string(),
});

export const DayResponseSchema = z.object({
  listings: z.array(CalendarRowSchema),
  progress: z.object({ completed: z.number().int(), total: z.number().int() }),
});

// Admin assignment (§7)
export const RandomAssignRequestSchema = z.object({
  user_id: z.string(),
  date: calendarDate,
  count: z.number().int().min(1).max(200),
});

export const RandomAssignResponseSchema = z.object({
  assigned: z.array(z.string()),
  day: z.array(CalendarRowSchema).optional(),
});

export const RemoveAssignRequestSchema = z.object({ listing_ids: z.array(z.string()) });
export const RemoveAssignResponseSchema = z.object({ removed: z.array(z.string()) });

export const ByIdAssignRequestSchema = z.object({
  user_id: z.string(),
  date: calendarDate,
  listing_ids: z.array(z.string()),
});

export const ByIdAssignResponseSchema = z.object({
  assigned: z.array(z.string()),
  skipped: z.array(z.object({ id: z.string(), reason: z.string() })),
});

/** `GET /admin/listings/search?q=` (API_CONTRACT.md §7) — the by-id screen's
 *  search across both areas (UI §8.3.3: id, court, municipality, region, or
 *  description). Not restricted to active listings — the only two documented
 *  skip reasons for the assign step itself are "nonexistent" and "already
 *  completed", so search results may include archived rows too. */
export const ListingSearchResultSchema = z.object({
  id: z.string(),
  area: z.enum(AREA_SLUGS),
  tipo_bene: z.string().nullable(),
  tribunale: z.string().nullable(),
  blocco_key: z.string().nullable(),
  comune: z.string().nullable(),
  provincia: z.string().nullable(),
  regione: z.string().nullable(),
  valore_richiesto: z.number().nullable(),
  completed: z.boolean(),
});

export const ListingSearchResponseSchema = z.object({
  results: z.array(ListingSearchResultSchema),
});

export type MonthDay = z.infer<typeof MonthDaySchema>;
export type MonthResponse = z.infer<typeof MonthResponseSchema>;
export type CalendarRow = z.infer<typeof CalendarRowSchema>;
export type DayResponse = z.infer<typeof DayResponseSchema>;
export type RandomAssignRequest = z.infer<typeof RandomAssignRequestSchema>;
export type RandomAssignResponse = z.infer<typeof RandomAssignResponseSchema>;
export type RemoveAssignRequest = z.infer<typeof RemoveAssignRequestSchema>;
export type RemoveAssignResponse = z.infer<typeof RemoveAssignResponseSchema>;
export type ByIdAssignRequest = z.infer<typeof ByIdAssignRequestSchema>;
export type ByIdAssignResponse = z.infer<typeof ByIdAssignResponseSchema>;
export type ListingSearchResult = z.infer<typeof ListingSearchResultSchema>;
export type ListingSearchResponse = z.infer<typeof ListingSearchResponseSchema>;
