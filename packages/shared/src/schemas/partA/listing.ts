// Part A — `listings` (DATA_MODEL.md §3). Scraper-owned, READ-ONLY here.
// Nullable fields are explicit; unknown extra fields are tolerated
// (passthrough — the scraper may add optional fields unilaterally, §1);
// `content_hash` is present but opaque (§1).
import { z } from 'zod';
import { calendarDate, instant, opaqueString } from '../common.js';

export const ScopeSchema = z.enum(['immobili', 'corporate']);

/** One document published with the lot (DATA_MODEL.md §3.5). `url` is
 *  absolute and ready to download — the scraper resolves the resource host
 *  and the percent-encoding, so nothing here needs to know either. */
export const AllegatoSchema = z
  .object({
    nome: z.string(),
    tipo: z.string().nullable().optional(),
    dimensione: z.number().int().nullable().optional(),
    url: z.string(),
  })
  .passthrough();

export const ListingSchema = z
  .object({
    id: z.number().int(),
    scope: ScopeSchema,
    tipo_bene: z.string().nullable(),
    cod_tipo_categ_lotto: z.string().nullable(),
    tipo_procedura: z.string().nullable(),
    cod_tipo_rito: z.string().nullable(),
    cod_tipo_registro: z.string().nullable(),
    numero: z.string().nullable(),
    anno: z.string().nullable(),
    tribunale: z.string().nullable(),
    // Legitimately 0 for many credits — zero is a value, not a gap (§3.1).
    valore_richiesto: z.number().nullable(),
    data_pubblicazione: calendarDate.nullable(),
    data_vendita: calendarDate.nullable(),
    regione: z.string().nullable(),
    provincia: z.string().nullable(),
    comune: z.string().nullable(),
    link: z.string(),
    disponibilita: z.string(),
    descrizione: z.string(), // may be empty, never null
    // Always a list, empty when the lot publishes no documents. Defaulted
    // because listings written before this field existed simply lack it.
    allegati: z.array(AllegatoSchema).default([]),
    archived_at: instant.nullable(),
    first_seen_at: instant,
    last_seen_at: instant,
    content_hash: opaqueString,
  })
  .passthrough();

export type Allegato = z.infer<typeof AllegatoSchema>;
export type Listing = z.infer<typeof ListingSchema>;
