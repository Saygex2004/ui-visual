// Part A — `meta` (DATA_MODEL.md §5). Read-only. Four well-known docs:
// `immobili`, `corporate` (scope shape), `omi`, and `procedure_concorsuali`.
// Also the cache-invalidation signal (SPECIFICATIONS.md §8).
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

/** Written by the scraper after it imports the insolvency procedures.
 *
 *  It exists to be a cache-invalidation signal and nothing else. Without it
 *  an import was invisible to the running server: the procedures are baked
 *  into the cached snapshot, but nothing the cache watched had changed, so
 *  newly matched procedures only surfaced on the max-age rebuild — up to a
 *  day later, or after someone forced a new Cloud Run revision by hand. */
export const ProcedureMetaSchema = z
  .object({
    last_import_at: instant,
    /** How many documents the import wrote. Informational. */
    total: z.number().int().optional(),
  })
  .passthrough();

export type ScopeMeta = z.infer<typeof ScopeMetaSchema>;
export type ProcedureMeta = z.infer<typeof ProcedureMetaSchema>;
export type OmiMeta = z.infer<typeof OmiMetaSchema>;
