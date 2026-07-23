// Part B — calendar (DATA_MODEL.md §11).
// `calendar_days` id = `{user_id}_{YYYY-MM-DD}`; `assignment_index` id = listing id.
import { z } from 'zod';
import { calendarDate, instant } from '../common.js';

export const CalendarDaySchema = z.object({
  user_id: z.string(),
  date: calendarDate,
  listing_ids: z.array(z.string()),
  generated: z.enum(['auto', 'admin', 'mixed']),
  created_at: instant,
  updated_at: instant,
});

export const AssignmentIndexEntrySchema = z.object({
  assigned_to: z.string(),
  date: calendarDate,
  assigned_at: instant,
  // Set when any user rates the listing; NEVER cleared (completion is permanent).
  completed_at: instant.nullable(),
});

export type CalendarDay = z.infer<typeof CalendarDaySchema>;
export type AssignmentIndexEntry = z.infer<typeof AssignmentIndexEntrySchema>;
