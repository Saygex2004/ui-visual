// Part A — `meta` (DATA_MODEL.md §5). Read-only. Exactly three well-known docs:
// `immobili`, `corporate` (scope shape) and `omi`. Also the cache-invalidation
// signal (SPECIFICATIONS.md §8).
import { z } from 'zod';
import { instant } from '../common.js';

export const ScopeMetaSchema = z
  .object({
    last_success_at: instant,
    total_active: z.number().int(),
    total_stored: z.number().int(),
    detail_errors: z.number().int(),
  })
  .passthrough();

export const OmiMetaSchema = z
  .object({
    fetched_at: instant,
    semestre: z.string(),
  })
  .passthrough();

export type ScopeMeta = z.infer<typeof ScopeMetaSchema>;
export type OmiMeta = z.infer<typeof OmiMetaSchema>;
