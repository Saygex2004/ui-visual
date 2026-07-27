// Snapshot builder (SPECIFICATIONS.md §8, API_CONTRACT.md §3). Reads a scope's
// full active + archived sets (and, for immobili, the OMI map + meta), classifies
// every listing with the shared domain rules, groups blocchi area-wide, trims
// descriptions, and assembles the AreaSnapshot. The version is a content hash
// so the ETag changes exactly when content does.
//
// Split in two: `assembleSnapshot` is PURE (in-memory inputs → AreaSnapshot,
// no I/O) — the payload-budget test drives it directly with a synthetic 10k
// listing set, no emulator required. `buildSnapshot` is the I/O wrapper the
// cache actually calls, fetching via the repository layer.
import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import {
  classifyListing,
  groupBlocchi,
  mapRefreshMetadata,
  REAL_ESTATE_CLUSTERS,
  CREDITS_CLUSTERS,
  SCOPE_TO_AREA_SLUG,
  KNOWN_CATEGORY_CODES,
  type Scope,
  type Listing,
  type AreaSnapshot,
  type ClusterBlock,
  type ListingRow,
  type ArchiveRow,
  type OmiEntry,
  type BloccoIndexEntry,
  type BloccoSibling,
  type OmiPrice,
} from '@pvp/shared';
import { listingsRepo, omiPricesRepo, metaRepo } from '../repositories/index.js';
import { toListingRow, toOmiEntry } from './rows.js';

export interface BuiltSnapshot {
  snapshot: AreaSnapshot;
  activeIds: Set<string>;
  archivedIds: Set<string>;
  /** In-memory summaries of ACTIVE listings, for blocco-sibling lookups on the
   *  detail path (not serialized into the snapshot). */
  summariesById: Map<string, BloccoSibling>;
  /** Raw OMI docs by slug (immobili only), for the detail OMI selection. */
  omiBySlug: Record<string, OmiPrice>;
  /** `cod_tipo_rito` values observed on active immobili listings but not in
   *  the catalog (DOMAIN_RULES.md Appendix A) — admin-only data, deliberately
   *  not part of `AreaSnapshot` itself (no reason to grow the payload-budget-
   *  tested dashboard response). Empty for the corporate scope. */
  unrecognizedCategoryCodes: string[];
}

function clusterDefsFor(
  scope: Scope,
): ReadonlyArray<{ key: string; number: number; name: string }> {
  return scope === 'immobili' ? REAL_ESTATE_CLUSTERS : CREDITS_CLUSTERS;
}

function contentVersion(parts: Omit<AreaSnapshot, 'version' | 'built_at'>): string {
  return createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

export interface ScopeMetaInput {
  last_success_at: string;
  total_active: number;
  total_stored: number;
  detail_errors: number;
}

/** Pure assembly: in-memory listings/OMI/meta → AreaSnapshot. No I/O. */
export function assembleSnapshot(
  scope: Scope,
  active: readonly Listing[],
  archived: readonly Listing[],
  omiMap: Readonly<Record<string, OmiPrice>>,
  scopeMeta: ScopeMetaInput | null,
  omiMeta: { fetched_at: string; semestre: string } | null,
): BuiltSnapshot {
  const isImmobili = scope === 'immobili';

  const defs = clusterDefsFor(scope);
  const blocks = new Map<string, ClusterBlock>(
    defs.map((d) => [
      d.key,
      { key: d.key, number: d.number, name: d.name, buckets: { principali: [], fallimenti: [] } },
    ]),
  );

  const summariesById = new Map<string, BloccoSibling>();
  const unrecognizedCodes = new Set<string>();
  let excludedCount = 0;
  for (const listing of active) {
    const { clusterKey, bucket, excluded } = classifyListing(listing);
    // Summaries cover every active listing (blocchi span exclusion state).
    summariesById.set(String(listing.id), {
      id: String(listing.id),
      cluster_key: clusterKey,
      bucket,
      tipo_bene: listing.tipo_bene,
      comune: listing.comune,
      valore_richiesto: listing.valore_richiesto,
    });
    if (
      isImmobili &&
      listing.cod_tipo_rito != null &&
      !KNOWN_CATEGORY_CODES.has(listing.cod_tipo_rito)
    ) {
      unrecognizedCodes.add(listing.cod_tipo_rito);
    }
    if (excluded) {
      excludedCount += 1; // counted, not shown in any cluster (§5)
      continue;
    }
    const block = blocks.get(clusterKey);
    if (block) block.buckets[bucket].push(toListingRow(listing));
  }

  // Archive rows carry their cluster-of-origin (the archive mixes clusters).
  const archive: ArchiveRow[] = archived.map((listing) => {
    const row: ListingRow = toListingRow(listing);
    return { ...row, cluster_key: classifyListing(listing).clusterKey };
  });

  // Blocco index — area-wide over ACTIVE listings.
  const bloccoRaw = groupBlocchi(active);
  const blocco_index: Record<string, BloccoIndexEntry> = {};
  for (const [key, entry] of Object.entries(bloccoRaw)) {
    blocco_index[key] = {
      count: entry.count,
      listing_ids: entry.listing_ids,
      clusters: entry.clusters,
    };
  }

  const omi_by_comune: Record<string, OmiEntry> = {};
  if (isImmobili) {
    for (const [slug, doc] of Object.entries(omiMap)) omi_by_comune[slug] = toOmiEntry(doc);
  }

  const meta = mapRefreshMetadata({
    scope,
    meta: scopeMeta,
    omiMeta,
    excludedByRules: isImmobili ? excludedCount : null,
  });

  const core = {
    meta,
    clusters: [...blocks.values()],
    archive,
    omi_by_comune,
    blocco_index,
  } satisfies Omit<AreaSnapshot, 'version' | 'built_at'>;

  const snapshot: AreaSnapshot = {
    version: contentVersion(core),
    built_at: new Date().toISOString(),
    ...core,
  };

  return {
    snapshot,
    activeIds: new Set(active.map((l) => String(l.id))),
    archivedIds: new Set(archived.map((l) => String(l.id))),
    summariesById,
    omiBySlug: omiMap,
    unrecognizedCategoryCodes: [...unrecognizedCodes].sort(),
  };
}

/** I/O wrapper: fetch a scope's data via the repository layer, then assemble. */
export async function buildSnapshot(db: Firestore, scope: Scope): Promise<BuiltSnapshot> {
  const { active, archived } = await listingsRepo.getByScope(db, scope);
  const isImmobili = scope === 'immobili';

  const [scopeMeta, omiMeta, omiMap] = await Promise.all([
    metaRepo.getScopeMeta(db, scope),
    isImmobili ? metaRepo.getOmiMeta(db) : Promise.resolve(null),
    isImmobili ? omiPricesRepo.getAllBySlug(db) : Promise.resolve<Record<string, OmiPrice>>({}),
  ]);

  return assembleSnapshot(scope, active, archived, omiMap, scopeMeta, omiMeta);
}

// Re-exported for callers that map an area slug ⇄ scope.
export { SCOPE_TO_AREA_SLUG };
