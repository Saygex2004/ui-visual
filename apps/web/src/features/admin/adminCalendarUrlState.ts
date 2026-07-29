// URL search-param contract for /admin/calendario (FRONTEND.md §2, UI §8.3):
// which of the three assignment tasks is active.
import { z } from 'zod';

export const ADMIN_CALENDAR_TABS = ['casuale', 'rimozione', 'per-id'] as const;
export type AdminCalendarTab = (typeof ADMIN_CALENDAR_TABS)[number];

export const adminCalendarSearchSchema = z.object({
  tab: z.enum(ADMIN_CALENDAR_TABS).catch('casuale'),
});

export type AdminCalendarSearch = z.infer<typeof adminCalendarSearchSchema>;
