// URL search-param contract for /aste/:area and /aste/:area/lotto/:id
// (FRONTEND.md §2) — the single source of truth the table, toolbar, tabs, and
// nav all read from and write to. Every field is individually wrapped in
// `.catch()` so a missing OR malformed value silently falls back to a default
// instead of failing the whole object parse — a stale/hand-edited link must
// never error (FRONTEND.md §2's binding rule). `regione`/`capoluogo`/
// `provincia`/`blocco` are reserved here (typed, round-trip-safe) but have no
// reading/writing UI control until Phase 5.
import { z } from 'zod';
import { OCCUPANCY_LABELS } from '@pvp/shared';

export const SORT_KEYS = ['blocco', 'valore', 'pubblicazione', 'vendita'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_DIRS = ['asc', 'desc'] as const;
export type SortDir = (typeof SORT_DIRS)[number];

export const BUCKET_TABS = ['principali', 'fallimenti'] as const;
export type BucketTab = (typeof BUCKET_TABS)[number];

export const PANEL_TABS = ['dettagli', 'storico', 'chat'] as const;
export type PanelTab = (typeof PANEL_TABS)[number];

/** The active section of an area view: a cluster's local number, or the
 *  separate Archivio section (UI §2.3). */
export type ClusterSelector = number | 'archivio';

const clusterSchema = z.union([z.coerce.number().int().positive(), z.literal('archivio')]).catch(1);

export const areaSearchSchema = z.object({
  cluster: clusterSchema,
  tab: z.enum(BUCKET_TABS).catch('principali'),
  q: z.string().optional().catch(undefined),
  tipo: z.string().optional().catch(undefined),
  procedura: z.string().optional().catch(undefined),
  disponibilita: z.enum(OCCUPANCY_LABELS).optional().catch(undefined),
  tribunale: z.string().optional().catch(undefined),
  min: z.coerce.number().nonnegative().optional().catch(undefined),
  max: z.coerce.number().nonnegative().optional().catch(undefined),
  sort: z.enum(SORT_KEYS).optional().catch(undefined),
  dir: z.enum(SORT_DIRS).catch('asc'),
  // Reserved for Phase 5 (drill-down + blocco isolation) — round-trip-typed,
  // no control reads or writes these yet.
  regione: z.string().optional().catch(undefined),
  capoluogo: z.string().optional().catch(undefined),
  provincia: z.string().optional().catch(undefined),
  blocco: z.string().optional().catch(undefined),
});

export type AreaSearch = z.infer<typeof areaSearchSchema>;

export const listingSearchSchema = areaSearchSchema.extend({
  pannello: z.enum(PANEL_TABS).catch('dettagli'),
});

export type ListingSearch = z.infer<typeof listingSearchSchema>;

/** Clamp a requested cluster selector to a valid one for `clusterCount`
 *  clusters in this area — an out-of-range number (e.g. a stale link from
 *  before a cluster was removed) falls back to cluster 1, never errors. */
export function resolveClusterSelector(
  requested: ClusterSelector,
  clusterCount: number,
): ClusterSelector {
  if (requested === 'archivio') return 'archivio';
  if (requested < 1 || requested > clusterCount) return 1;
  return requested;
}
