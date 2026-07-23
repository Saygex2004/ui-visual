// API — GET /listings/:id (API_CONTRACT.md §3). One listing in full: every
// stored field (untrimmed descrizione), its classification, blocco siblings,
// OMI context (§9), current rating, thread summary, and header facts.
import { z } from 'zod';
import { PriceBandSchema, OmiEntrySchema } from './snapshot.js';
import { RatingSchema } from '../partB/ratings.js';

export const ClassificationSchema = z.object({
  area: z.enum(['immobili', 'corporate']),
  cluster_key: z.string(),
  cluster_number: z.number().int(),
  cluster_name: z.string(),
  bucket: z.enum(['principali', 'fallimenti']),
  excluded: z.boolean(),
  band: PriceBandSchema,
});

export const BloccoSiblingSchema = z.object({
  id: z.string(),
  cluster_key: z.string(),
  bucket: z.enum(['principali', 'fallimenti']),
  tipo_bene: z.string().nullable(),
  comune: z.string().nullable(),
  valore_richiesto: z.number().nullable(),
});

export const ThreadSummarySchema = z.object({
  exists: z.boolean(),
  closed: z.boolean(),
  unread: z.number().int(),
});

export const ListingDetailSchema = z.object({
  // Every stored field, verbatim (untrimmed descrizione).
  id: z.string(),
  scope: z.enum(['immobili', 'corporate']),
  tipo_bene: z.string().nullable(),
  cod_tipo_categ_lotto: z.string().nullable(),
  tipo_procedura: z.string().nullable(),
  cod_tipo_rito: z.string().nullable(),
  cod_tipo_registro: z.string().nullable(),
  numero: z.string().nullable(),
  anno: z.string().nullable(),
  tribunale: z.string().nullable(),
  valore_richiesto: z.number().nullable(),
  data_pubblicazione: z.string().nullable(),
  data_vendita: z.string().nullable(),
  regione: z.string().nullable(),
  provincia: z.string().nullable(),
  comune: z.string().nullable(),
  link: z.string(),
  disponibilita: z.string(),
  descrizione: z.string(),
  archived_at: z.string().nullable(),

  classification: ClassificationSchema,
  blocco: z
    .object({ key: z.string(), count: z.number().int(), siblings: z.array(BloccoSiblingSchema) })
    .nullable(),
  omi: OmiEntrySchema.nullable(),
  rating: RatingSchema.nullable(),
  thread: ThreadSummarySchema,
});

export type Classification = z.infer<typeof ClassificationSchema>;
export type BloccoSibling = z.infer<typeof BloccoSiblingSchema>;
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;
export type ListingDetail = z.infer<typeof ListingDetailSchema>;
