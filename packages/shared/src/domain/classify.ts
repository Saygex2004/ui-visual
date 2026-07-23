// Read-time classification (DOMAIN_RULES.md §§1–5). Pure functions of stored
// listing fields; nothing is ever stored classified.
import {
  REGION_TO_CLUSTER,
  CATEG_LOTTO_TO_CLUSTER,
  REAL_ESTATE_CLUSTERS,
  CREDITS_CLUSTERS,
  BLACK_ZONE_KEY,
  CREDITS_DEFAULT_CLUSTER,
  type ClusterKey,
  type RealEstateClusterKey,
  type CreditsClusterKey,
} from '../constants/clusters.js';
import { FALLIMENTI_RITO_CODES, type Bucket } from '../constants/buckets.js';
import { EXCLUSION_RITO_CODES } from '../constants/exclusions.js';
import type { Scope } from '../constants/areas.js';
import { priceBand } from './priceBand.js';
import type { PriceBand } from '../constants/bands.js';

/** The minimal listing shape classification depends on. */
export interface ClassifyInput {
  scope: Scope;
  regione?: string | null;
  cod_tipo_categ_lotto?: string | null;
  cod_tipo_rito?: string | null;
  valore_richiesto?: number | null;
}

export interface ListingClassification {
  area: Scope;
  clusterKey: ClusterKey;
  clusterNumber: number;
  clusterName: string;
  bucket: Bucket;
  excluded: boolean;
  band: PriceBand;
}

const RE_CLUSTER_BY_KEY = new Map(REAL_ESTATE_CLUSTERS.map((c) => [c.key, c] as const));
const CREDITS_CLUSTER_BY_KEY = new Map(CREDITS_CLUSTERS.map((c) => [c.key, c] as const));

/** Real-estate cluster by region — Black Zone when null/unrecognized (§2). */
export function assignRealEstateCluster(regione: string | null | undefined): RealEstateClusterKey {
  if (regione == null) return BLACK_ZONE_KEY;
  return REGION_TO_CLUSTER.get(regione) ?? BLACK_ZONE_KEY;
}

/** Credits cluster by asset code — Crediti as the defensive default (§3). */
export function assignCreditsCluster(code: string | null | undefined): CreditsClusterKey {
  if (code == null) return CREDITS_DEFAULT_CLUSTER;
  return CATEG_LOTTO_TO_CLUSTER.get(code) ?? CREDITS_DEFAULT_CLUSTER;
}

/** Bucket split (§4): FALL/NFAL → Fallimenti; null/other → Principali. */
export function assignBucket(codTipoRito: string | null | undefined): Bucket {
  return codTipoRito != null && FALLIMENTI_RITO_CODES.has(codTipoRito)
    ? 'fallimenti'
    : 'principali';
}

/**
 * Exclusion (§5) — real estate only. Null/unrecognized rito is never excluded
 * (fail-open). The corporate scope is never evaluated.
 */
export function isExcluded(scope: Scope, codTipoRito: string | null | undefined): boolean {
  if (scope !== 'immobili') return false;
  if (codTipoRito == null) return false;
  return EXCLUSION_RITO_CODES.has(codTipoRito);
}

export function classifyListing(listing: ClassifyInput): ListingClassification {
  const bucket = assignBucket(listing.cod_tipo_rito);
  const band = priceBand(listing.valore_richiesto);

  if (listing.scope === 'immobili') {
    const clusterKey = assignRealEstateCluster(listing.regione);
    const cluster = RE_CLUSTER_BY_KEY.get(clusterKey)!;
    return {
      area: 'immobili',
      clusterKey,
      clusterNumber: cluster.number,
      clusterName: cluster.name,
      bucket,
      excluded: isExcluded('immobili', listing.cod_tipo_rito),
      band,
    };
  }

  const clusterKey = assignCreditsCluster(listing.cod_tipo_categ_lotto);
  const cluster = CREDITS_CLUSTER_BY_KEY.get(clusterKey)!;
  return {
    area: 'corporate',
    clusterKey,
    clusterNumber: cluster.number,
    clusterName: cluster.name,
    bucket,
    excluded: false,
    band,
  };
}
