// Price band (DOMAIN_RULES.md §7). Pure function of `valore_richiesto`.
//   Bassa: value < 100 000
//   Media: 100 000 ≤ value ≤ 400 000, OR value is null (unknown → middle band)
//   Alta:  value > 400 000
// Boundary values (99 999.99 / 100 000 / 400 000 / 400 000.01), `0` (→ Bassa),
// `null` (→ Media) are covered in the unit suite.
import { BAND_BASSA_MAX, BAND_MEDIA_MAX, type PriceBand } from '../constants/bands.js';

export function priceBand(value: number | null | undefined): PriceBand {
  if (value == null) return 'media'; // unknown falls in the middle band
  if (value < BAND_BASSA_MAX) return 'bassa';
  if (value <= BAND_MEDIA_MAX) return 'media';
  return 'alta';
}
