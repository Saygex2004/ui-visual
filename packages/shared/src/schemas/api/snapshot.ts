// API — the area snapshot payload (API_CONTRACT.md §3). The entire pre-computed
// dataset for an area, served from the server cache. Ratings are NOT embedded
// (they change on a faster clock, §4) — the client joins them from the ratings
// poll. `descrizione` on a row is a ≤200-char excerpt; the workspace fetches
// full text via GET /listings/:id.
import { z } from 'zod';
import { PRICE_BANDS } from '../../constants/bands.js';

export const PriceBandSchema = z.enum(PRICE_BANDS);

/** OMI display entry (DOMAIN_RULES.md §9); the reference is always residential. */
export const OmiEntrySchema = z.object({
  provincia: z.string(),
  comune: z.string(),
  tipologia: z.string().nullable(),
  stato: z.string().nullable(),
  min_mq: z.number().nullable(),
  max_mq: z.number().nullable(),
  zona: z.string().nullable(),
  semestre: z.string(),
  available: z.boolean(), // false when the source doc had `error` set
});

/** A table row — UI §4.1 columns plus routing facts. */
export const ListingRowSchema = z.object({
  id: z.string(),
  tipo_bene: z.string().nullable(),
  tipo_procedura: z.string().nullable(),
  disponibilita: z.string(),
  descrizione_excerpt: z.string(), // ≤200 chars
  numero: z.string().nullable(),
  anno: z.string().nullable(),
  tribunale: z.string().nullable(),
  regione: z.string().nullable(),
  provincia: z.string().nullable(),
  comune: z.string().nullable(),
  valore_richiesto: z.number().nullable(),
  band: PriceBandSchema,
  data_pubblicazione: z.string().nullable(),
  data_vendita: z.string().nullable(),
  link: z.string(),
  blocco_key: z.string().nullable(),
  archived_at: z.string().nullable(),
  /** Presence-only flag (DOMAIN_RULES.md §12) — a matching procedura
   *  concorsuale exists, regardless of whether its debtor detail has been
   *  read yet. The actual facts are workspace-detail-only. */
  has_procedura_concorsuale: z.boolean(),
});

/** Procedura concorsuale display entry (DOMAIN_RULES.md §12); the workspace
 *  detail panel's data, joined server-side, never per-row. */
export const ProceduraConcorsualeEntrySchema = z.object({
  nome: z.string(),
  tipo_code: z.string().nullable(),
  tipo_procedura: z.string().nullable(),
  professionista: z.string().nullable(),
  giudice_delegato: z.string().nullable(),
  debitore: z
    .object({
      codice_fiscale: z.string().nullable(),
      partita_iva: z.string().nullable(),
      ragione_sociale: z.string().nullable(),
      citta: z.string().nullable(),
      indirizzo: z.string().nullable(),
    })
    .nullable(),
  link: z.string(),
  // true once the source's detail page has been read (debtor facts present);
  // mirrors OmiEntry's `available`, but here it means "scheda_letta_il set",
  // not "no error" — DATA_MODEL.md §17.2.
  available: z.boolean(),
});

export const ArchiveRowSchema = ListingRowSchema.extend({
  cluster_key: z.string(),
});

export const ClusterBlockSchema = z.object({
  key: z.string(),
  number: z.number().int(),
  name: z.string(),
  buckets: z.object({
    principali: z.array(ListingRowSchema),
    fallimenti: z.array(ListingRowSchema),
  }),
});

export const BloccoIndexEntrySchema = z.object({
  count: z.number().int(),
  listing_ids: z.array(z.string()),
  clusters: z.array(z.string()),
});

export const SnapshotMetaSchema = z.object({
  last_success_at: z.string().nullable(),
  total_active: z.number().int().nullable(),
  total_stored: z.number().int().nullable(),
  detail_errors: z.number().int().nullable(),
  excluded_by_rules: z.number().int().nullable(), // immobili only
  omi: z.object({ fetched_at: z.string(), semestre: z.string() }).nullable(), // immobili only
});

export const AreaSnapshotSchema = z.object({
  version: z.string(), // cache build id — the ETag
  built_at: z.string(),
  meta: SnapshotMetaSchema,
  clusters: z.array(ClusterBlockSchema),
  archive: z.array(ArchiveRowSchema),
  omi_by_comune: z.record(z.string(), OmiEntrySchema),
  blocco_index: z.record(z.string(), BloccoIndexEntrySchema),
});

export type OmiEntry = z.infer<typeof OmiEntrySchema>;
export type ProceduraConcorsualeEntry = z.infer<typeof ProceduraConcorsualeEntrySchema>;
export type ListingRow = z.infer<typeof ListingRowSchema>;
export type ArchiveRow = z.infer<typeof ArchiveRowSchema>;
export type ClusterBlock = z.infer<typeof ClusterBlockSchema>;
export type BloccoIndexEntry = z.infer<typeof BloccoIndexEntrySchema>;
export type SnapshotMeta = z.infer<typeof SnapshotMetaSchema>;
export type AreaSnapshot = z.infer<typeof AreaSnapshotSchema>;
