// Part B — `pratiche`: the archived-case register, entered by hand from the
// admin-only "Pratiche" view. App-owned data: unlike listings/procedures
// nothing here comes from a scraper, so this schema is the only definition of
// the shape and the API validates every write against it.
//
// Two fields carry business meaning that is easy to get wrong later:
// `ndg` identifies the CLIENT/position (one NDG can own several pratiche),
// while `numero_pratica` identifies one case file. Neither is unique on its
// own in a way worth enforcing here — the same case can legitimately be
// re-filed — so the document id stays a generated one and both stay plain
// searchable strings.
import { z } from 'zod';
import { instant } from '../common.js';

/** Trimmed, and empty-becomes-absent: a form submits "" for an untouched
 *  optional input, and storing that would make "no value" and "explicitly
 *  blank" indistinguishable in every later filter and export. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .default(null);

const requiredText = z.string().trim().min(1);

export const PraticaInputSchema = z.object({
  /** Numero di Gruppo — the client/position identifier. */
  ndg: requiredText,
  /** The case-file reference, e.g. "163354". A string, not a number: these
   *  are identifiers, and leading zeros in them are meaningful. */
  numero_pratica: requiredText,
  /** The project the case belongs to, e.g. "Augusto", "Diocleziano". Free
   *  text rather than an enum — new vehicles appear, and a closed list would
   *  block data entry the day one does. */
  veicolo: optionalText,
  /** Whether the position is extinguished. */
  estinto: z.boolean().default(false),
  /** Physical box the file is archived in. Positive integer or absent —
   *  never 0, which would read as "box zero" rather than "not filed yet". */
  n_scatola: z.number().int().positive().nullable().default(null),
  /** Supplier / archival-lot identifier; often repeats the vehicle name or a
   *  riscontro code. */
  plurima_riscontro: optionalText,
  /** Free-text extras as they appear in the source records, e.g. "numero
   *  finanziamento", "Corrispondenza relativa alla pratica", "Rinnovo
   *  ipoteca". */
  note: optionalText,
  /** Id of the account that ordered the case file. Nullable because a case
   *  can be registered before anyone has requested it. */
  ordinato_da: z.string().trim().nullable().default(null),
});

export type PraticaInput = z.infer<typeof PraticaInputSchema>;

export const PraticaSchema = PraticaInputSchema.extend({
  id: z.string(),
  created_at: instant,
  created_by: z.string(),
  updated_at: instant.nullable().default(null),
  updated_by: z.string().nullable().default(null),
});

export type Pratica = z.infer<typeof PraticaSchema>;

/** Every field a caller may change after creation — i.e. all of the input,
 *  each part optional. Bookkeeping (`created_*`, `updated_*`) is set by the
 *  server and deliberately not accepted from the client. */
export const PraticaPatchSchema = PraticaInputSchema.partial();

export type PraticaPatch = z.infer<typeof PraticaPatchSchema>;
