// Listing → CalendarRow projection (API_CONTRACT.md §7), shared by the
// user-facing day view and the admin random/removal/by-id screens — mirrors
// `cache/rows.ts`'s `toListingRow` in spirit (same field-for-field pass-
// through, server sends raw facts, never composed prose, DATA_MODEL.md §2).
import { bloccoKey, SCOPE_TO_AREA_SLUG, type CalendarRow, type Listing } from '@pvp/shared';

export function toCalendarRow(listing: Listing): CalendarRow {
  return {
    id: String(listing.id),
    area: SCOPE_TO_AREA_SLUG[listing.scope],
    tipo_bene: listing.tipo_bene,
    tipo_procedura: listing.tipo_procedura,
    blocco_key: bloccoKey(listing),
    tribunale: listing.tribunale,
    regione: listing.regione,
    provincia: listing.provincia,
    comune: listing.comune,
    disponibilita: listing.disponibilita,
    valore_richiesto: listing.valore_richiesto,
    data_vendita: listing.data_vendita,
    link: listing.link,
  };
}
