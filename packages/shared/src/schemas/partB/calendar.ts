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
  // Null when the entry exists only to record a completion with no calendar
  // assignment behind it — rating happens from any dashboard row, entirely
  // independent of calendar assignment (Phase 8), so this is a permanently
  // valid state, not just a pre-Phase-8 gap (DATA_MODEL.md §11).
  assigned_to: z.string().nullable(),
  date: calendarDate.nullable(),
  assigned_at: instant.nullable(),
  // Set when any user rates the listing; NEVER cleared (completion is permanent).
  completed_at: instant.nullable(),
});

export type CalendarDay = z.infer<typeof CalendarDaySchema>;
export type AssignmentIndexEntry = z.infer<typeof AssignmentIndexEntrySchema>;
