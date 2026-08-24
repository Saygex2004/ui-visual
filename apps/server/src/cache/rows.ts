// Row/entry projection helpers: Listing (full Part A doc) → ListingRow (the
// trimmed table row, API_CONTRACT.md §3) and OmiPrice → OmiEntry.
import {
  priceBand,
  bloccoKey,
  hasProceduraConcorsuale,
  type Listing,
  type ListingRow,
  type OmiPrice,
  type OmiEntry,
  type ProceduraConcorsualeDoc,
} from '@pvp/shared';

export const DESCRIZIONE_EXCERPT_MAX = 200;

export function toListingRow(
  listing: Listing,
  proceduraByKey: Readonly<Record<string, ProceduraConcorsualeDoc>>,
): ListingRow {
  return {
    id: String(listing.id),
    tipo_bene: listing.tipo_bene,
    tipo_procedura: listing.tipo_procedura,
    disponibilita: listing.disponibilita,
    descrizione_excerpt: listing.descrizione.slice(0, DESCRIZIONE_EXCERPT_MAX),
    numero: listing.numero,
    anno: listing.anno,
    tribunale: listing.tribunale,
    regione: listing.regione,
    provincia: listing.provincia,
    comune: listing.comune,
    valore_richiesto: listing.valore_richiesto,
    band: priceBand(listing.valore_richiesto),
    data_pubblicazione: listing.data_pubblicazione,
    data_vendita: listing.data_vendita,
    link: listing.link,
    blocco_key: bloccoKey(listing),
    archived_at: listing.archived_at,
    has_procedura_concorsuale: hasProceduraConcorsuale(proceduraByKey, {
      tribunale: listing.tribunale,
      numero: listing.numero,
      anno: listing.anno,
    }),
  };
}

export function toOmiEntry(doc: OmiPrice): OmiEntry {
  return {
    provincia: doc.provincia,
    comune: doc.comune,
    tipologia: doc.tipologia,
    stato: doc.stato,
    min_mq: doc.min_mq,
    max_mq: doc.max_mq,
    zona: doc.zona,
    semestre: doc.semestre,
    available: doc.error === null,
  };
}
