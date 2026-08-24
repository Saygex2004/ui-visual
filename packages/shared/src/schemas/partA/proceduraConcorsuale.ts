// Part A — `procedure_concorsuali` (DATA_MODEL.md §17). Read-only, written by
// a separate, manually-run scraper source (not on any schedule). Joined onto
// listings by (tribunale key, numero, anno) -- not embedded/geography-keyed
// like omi_prices (DOMAIN_RULES.md §12).
import { z } from 'zod';
import { instant } from '../common.js';

const RgSchema = z.object({
  completo: z.string(),
  numero: z.string(),
  numero_base: z.string(),
  anno: z.number().int(),
});

const TribunaleSchema = z.object({
  nome: z.string().nullable(),
  chiave: z.string().nullable(),
});

const DebitoreSchema = z.object({
  codice_fiscale: z.string().nullable(),
  partita_iva: z.string().nullable(),
  ragione_sociale: z.string().nullable(),
  citta: z.string().nullable(),
  indirizzo: z.string().nullable(),
});

export const ProceduraConcorsualeSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    rg: RgSchema.nullable(),
    data_dichiarazione: z.string().nullable(),
    tipo_code: z.string().nullable(),
    tipo_procedura: z.string().nullable(),
    tribunale: TribunaleSchema,
    professionista: z.string().nullable(),
    giudice_delegato: z.string().nullable(),
    debitore: DebitoreSchema.nullable(),
    link: z.string(),
    estratto_il: instant,
    scheda_letta_il: instant.nullable(),
  })
  .passthrough();

export type ProceduraConcorsuale = z.infer<typeof ProceduraConcorsualeSchema>;
