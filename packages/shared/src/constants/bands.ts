// Price bands over `valore_richiesto` (DOMAIN_RULES.md §7).
//   Bassa: value < 100 000
//   Media: 100 000 ≤ value ≤ 400 000, OR value is null (unknown → middle band)
//   Alta:  value > 400 000
// Note the deliberate asymmetry with sorting (nulls sort lowest, §4.2) — both
// rules live side by side; do not "reconcile" them.

export type PriceBand = 'bassa' | 'media' | 'alta';

export const PRICE_BANDS: readonly PriceBand[] = ['bassa', 'media', 'alta'] as const;

/** Upper boundary of Bassa (exclusive): value < this ⇒ Bassa. */
export const BAND_BASSA_MAX = 100_000;
/** Upper boundary of Media (inclusive): value ≤ this ⇒ Media (when ≥ BASSA_MAX). */
export const BAND_MEDIA_MAX = 400_000;
