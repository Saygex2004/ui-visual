// Part A — `runs` (DATA_MODEL.md §6). Read-only, display-only audit trail; no
// feature may depend on its contents (§1).
import { z } from 'zod';
import { instant } from '../common.js';

export const RunSchema = z
  .object({
    scope: z.enum(['immobili', 'corporate', 'omi']),
    status: z.enum(['success', 'degraded', 'failed']),
    started_at: instant,
    finished_at: instant,
    total_enumerated: z.number().int(),
    written: z.number().int(),
    archived: z.number().int(),
    errors: z.number().int(),
    selection_codes: z.array(z.string()).nullable(),
    excluded_by_selection: z.number().int(),
    error_samples: z.array(z.string()),
  })
  .passthrough();

export type Run = z.infer<typeof RunSchema>;
