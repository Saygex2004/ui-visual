// Part B — `pratiche`: request, shipping and tracking of paper case files,
// entered by hand from the admin-only "Pratiche" view. App-owned data: nothing
// here comes from a scraper, so this schema is the only definition of the
// shape and the API validates every write against it.
//
// Two fields carry business meaning that is easy to get wrong later:
// `ndg` identifies the CLIENT/position (one NDG can own several pratiche),
// while `numero_pratica` identifies one case file. Neither is unique on its
// own in a way worth enforcing here — the same case can legitimately be
// re-filed — so the document id stays a generated one and both stay plain
// searchable strings.
import { z } from 'zod';
import { instant, calendarDate } from '../common.js';

/** Trimmed, and empty-becomes-absent: a form submits "" for an untouched
 *  optional input, and storing that would make "no value" and "explicitly
 *  blank" indistinguishable in every later filter and export.
 *
 *  Deliberately WITHOUT `.default(null)` — the default is added only in
 *  PraticaInputSchema. Baking it in here is what silently broke patching:
 *  everything built from these fields inherited the default, and `.partial()`
 *  cannot take it back off. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable();

const requiredText = z.string().trim().min(1);

/** Same rule as `optionalText`: no default here, only in the input schema. */
const optionalDate = calendarDate.nullable();

/** The life of a paper file, in order. Stored as these codes, never as the
 *  Italian labels: the labels are presentation and may be reworded, the codes
 *  are what filters and exports are written against. */
export const STATI_PRATICA = [
  'richiesto',
  'estratto',
  'spedito',
  'consegnato',
  'archiviato',
] as const;

export type StatoPratica = (typeof STATI_PRATICA)[number];

export const StatoPraticaSchema = z.enum(STATI_PRATICA);

/** The fields, WITHOUT defaults. Two schemas are built from this: creation
 *  adds defaults, patching must not have them — see PraticaPatchSchema. */
const CampiPratica = z.object({
  /** Numero di Gruppo — the client/position identifier. */
  ndg: requiredText,
  /** The case-file reference, e.g. "163354". A string, not a number: these
   *  are identifiers, and leading zeros in them are meaningful. */
  numero_pratica: requiredText,
  /** The portfolio the case belongs to, e.g. "Augusto", "Diocleziano". Free
   *  text rather than an enum — new portfolios appear, and a closed list would
   *  block data entry the day one does. */
  portafoglio: optionalText,
  /** Where the file is in its journey. */
  stato: StatoPraticaSchema,
  /** Which physical box(es) hold the file. Free text, not a number: a single
   *  file can span several boxes ("3, 7") and a numeric field could only ever
   *  record one of them. */
  n_scatole: optionalText,
  /** Free-text extras as they appear in the source records, e.g. "numero
   *  finanziamento", "Corrispondenza relativa alla pratica", "Rinnovo
   *  ipoteca". */
  note: optionalText,
  /** Id of the account that ordered the case file. Nullable because a case
   *  can be registered before anyone has requested it. */
  ordinato_da: z.string().trim().nullable(),

  // ---- dates: the tracking spine ----
  /** When the file was asked for. */
  data_richiesta: optionalDate,
  /** When it actually left. */
  data_spedizione: optionalDate,
  /** When it is expected — set at shipping time, and kept afterwards. */
  data_consegna_prevista: optionalDate,
  /** When it actually arrived. Deliberately separate from the expected date
   *  rather than overwriting it: keeping both is what makes a late delivery
   *  visible at all. */
  data_consegna_effettiva: optionalDate,

  /** Shipping cost in CENTS, not euros. Money in a floating-point field
   *  accumulates rounding once anyone totals a column (12.50 + 177.00 can
   *  land at 189.50000000000003); an integer number of cents cannot. The form
   *  and the export speak euros — the conversion lives at those two edges. */
  costo_spedizione_cent: z.number().int().nonnegative().nullable(),
});

/** Creation: an absent optional field takes its documented default. `stato`
 *  starts at `richiesto` because a record exists precisely because someone
 *  asked for the file, which is that state. */
export const PraticaInputSchema = CampiPratica.extend({
  portafoglio: optionalText.default(null),
  stato: StatoPraticaSchema.default('richiesto'),
  n_scatole: optionalText.default(null),
  note: optionalText.default(null),
  ordinato_da: z.string().trim().nullable().default(null),
  data_richiesta: optionalDate.default(null),
  data_spedizione: optionalDate.default(null),
  data_consegna_prevista: optionalDate.default(null),
  data_consegna_effettiva: optionalDate.default(null),
  costo_spedizione_cent: z.number().int().nonnegative().nullable().default(null),
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

/**
 * Patching: every field optional and **no defaults**, deliberately built from
 * `CampiPratica` rather than from `PraticaInputSchema.partial()`.
 *
 * A field carrying `.default(null)` is already optional, so `.partial()` does
 * not make it absent-when-missing — the default fires and the key comes back
 * as null. Deriving the patch schema from the input schema therefore turned
 * "change the stage" into "change the stage and erase every date, the
 * portfolio, the boxes, the notes and the cost". Caught by the integration
 * test asserting an untouched `data_spedizione` survives a partial patch
 * (2026-08-24); it would have silently destroyed real records.
 */
export const PraticaPatchSchema = CampiPratica.partial();

export type PraticaPatch = z.infer<typeof PraticaPatchSchema>;
