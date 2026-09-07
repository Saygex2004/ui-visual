// Part B — `carta_azienda`: companies added from the admin panel, on top of
// the ones shipped in code.
//
// Two things a shipped company has that an added one cannot: a logo file in
// the bundle, and a hand-written special header. So the logo travels INSIDE
// the document as a data URI rather than in Storage. The existing logos are
// 11-28 KB, the cap below is 300 KB, and Firestore allows 1 MB per document —
// so it fits with room to spare, and it buys a great deal:
//
//   - no signed URL to expire, which matters because the Word file fetches
//     the logo at generation time, possibly long after the page was opened;
//   - nothing to serve, sweep for orphans, or pay for;
//   - the preview `<img>` and the .docx encoder both take a data URI as-is.
import { z } from 'zod';
import { instant } from '../common.js';

const testo = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (v === '' ? null : v))
  .nullable();

const testoLungo = z
  .string()
  .trim()
  .max(1000)
  .transform((v) => (v === '' ? null : v))
  .nullable();

const coloreHeader = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/)
  .nullable();

/** A PNG or JPEG as a data URI. The prefix is checked rather than trusted:
 *  this string is put straight into an `<img src>` and into the generated
 *  document, so anything that is not an image must not get in. */
const logoDataUri = z
  .string()
  .max(400_000) // ~300 KB of image once base64 is undone
  .refine((v) => /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(v), {
    message: 'Il logo deve essere un PNG o JPEG',
  })
  .nullable();

/** The fields, WITHOUT defaults. Two schemas are built from this: creation
 *  adds defaults, patching must not have them.
 *
 *  Deriving the patch from the input schema instead is what silently broke
 *  patching in `pratiche`: a field carrying `.default(...)` is already
 *  optional, so `.partial()` does not make it absent-when-missing — the
 *  default fires and the key comes back set. Here that would mean editing the
 *  city quietly switched the printed name back on. */
const CampiAzienda = z.object({
  /** Legal name, as it appears in the letter. */
  nome: z.string().trim().min(1).max(200),
  /** The name as printed in the header, when it differs from the legal one
   *  (e.g. an all-caps trading name). Absent = use `nome`. */
  nome_header: testo,
  sottotitolo: testo,
  via: testo,
  cap: testo,
  citta: testo,
  pec: testo,
  email: testo,
  cf: testo,
  /** The city printed next to the date, where it differs from the registered
   *  office — some companies are registered abroad but write from Milan. */
  citta_data: testo,
  /** The small print along the bottom of the page. */
  footer_text: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  /** Header colour as `#RRGGBB`. Absent = the shipped default. */
  header_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable(),
  header_size: z.number().int().min(6).max(48).nullable(),
  logo: logoDataUri,
  /** The logo's natural pixel size, measured by the browser when it was
   *  chosen. Needed to fit it into the header without distorting it — a logo
   *  scaled to a fixed box is exactly how a wordmark ends up stretched. */
  logo_width: z.number().int().positive().nullable(),
  logo_height: z.number().int().positive().nullable(),
  /** Whether this company can be picked as the SENDER. Some are added purely
   *  to be written TO — their address and PEC are what is wanted, and
   *  offering them as a sender would only be a way to pick the wrong one. */
  usabile_come_mittente: z.boolean(),
  /** Whether to print the company's name across the top when there is no
   *  logo. Off leaves the head of the page bare — which is what some
   *  letterheads are: pre-printed paper, or a sheet that carries its identity
   *  only in the footer. Irrelevant when a logo is set: the logo IS the
   *  header, and the name is not printed alongside it. */
  stampa_nome_intestazione: z.boolean(),
});

export const CartaAziendaInputSchema = CampiAzienda.extend({
  nome_header: testo.default(null),
  sottotitolo: testo.default(null),
  via: testo.default(null),
  cap: testo.default(null),
  citta: testo.default(null),
  pec: testo.default(null),
  email: testo.default(null),
  cf: testo.default(null),
  citta_data: testo.default(null),
  footer_text: testoLungo.default(null),
  header_color: coloreHeader.default(null),
  header_size: z.number().int().min(6).max(48).nullable().default(null),
  logo: logoDataUri.default(null),
  logo_width: z.number().int().positive().nullable().default(null),
  logo_height: z.number().int().positive().nullable().default(null),
  usabile_come_mittente: z.boolean().default(true),
  stampa_nome_intestazione: z.boolean().default(true),
});

export const CartaAziendaSchema = CartaAziendaInputSchema.extend({
  id: z.string(),
  created_at: instant,
  created_by: z.string(),
  updated_at: instant.nullable().default(null),
  updated_by: z.string().nullable().default(null),
});

/** Patching: every field optional and no defaults — same discipline, and the
 *  same reason, as PraticaPatchSchema. */
export const CartaAziendaPatchSchema = CampiAzienda.partial();

export type CartaAziendaInput = z.infer<typeof CartaAziendaInputSchema>;
export type CartaAzienda = z.infer<typeof CartaAziendaSchema>;
export type CartaAziendaPatch = z.infer<typeof CartaAziendaPatchSchema>;
