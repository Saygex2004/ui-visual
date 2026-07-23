// Bucket split (DOMAIN_RULES.md §4): within every cluster, listings split into
// Fallimenti (old-law bankruptcy rito codes) vs Procedure principali (all else,
// including null/unknown rito).

export type Bucket = 'principali' | 'fallimenti';

export const BUCKETS: readonly Bucket[] = ['principali', 'fallimenti'] as const;

/** rito codes that route a listing to the Fallimenti bucket. */
export const FALLIMENTI_RITO_CODES: ReadonlySet<string> = new Set(['FALL', 'NFAL']);
