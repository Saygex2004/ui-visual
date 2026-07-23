// API — calendar bodies (API_CONTRACT.md §7).
import { z } from 'zod';
import { calendarDate } from '../common.js';

export const MonthDaySchema = z.object({
  date: calendarDate,
  assigned: z.number().int(),
  completed: z.number().int(),
  actionable: z.boolean(),
});

export const MonthResponseSchema = z.object({ days: z.array(MonthDaySchema) });

export const CalendarRowSchema = z.object({
  id: z.string(),
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

export type MonthDay = z.infer<typeof MonthDaySchema>;
export type MonthResponse = z.infer<typeof MonthResponseSchema>;
export type CalendarRow = z.infer<typeof CalendarRowSchema>;
export type DayResponse = z.infer<typeof DayResponseSchema>;
export type RandomAssignRequest = z.infer<typeof RandomAssignRequestSchema>;
export type ByIdAssignRequest = z.infer<typeof ByIdAssignRequestSchema>;
export type ByIdAssignResponse = z.infer<typeof ByIdAssignResponseSchema>;
