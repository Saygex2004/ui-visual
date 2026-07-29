// URL search-param contract for /calendario (FRONTEND.md §2) — just the
// selected month. /calendario/:date carries no search params of its own:
// a row's "Scheda"/"Chat" actions navigate away to the same
// /aste/:area/lotto/:id workspace route every other table already uses
// (DataTable.tsx, unchanged), not a calendar-nested drawer.
import { z } from 'zod';

export const calendarSearchSchema = z.object({
  mese: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .catch(undefined),
});

export type CalendarSearch = z.infer<typeof calendarSearchSchema>;
