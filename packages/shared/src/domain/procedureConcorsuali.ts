// Procedura concorsuale matching (DOMAIN_RULES.md §12, DATA_MODEL.md §17).
// Joins a listing to at most one `procedure_concorsuali` document by the
// exact tuple (tribunale key, numero, anno, KIND) -- never fuzzy, same "any
// null field means never matched" discipline as blocco grouping (blocco.ts).
//
// The kind is part of the key, not a refinement of it: the two registers the
// source publishes number their procedures INDEPENDENTLY, so
// "Fallimento 2/2022 Ancona" and "Liquidazione giudiziale 2/2022 Ancona" are
// two unrelated companies. 271 such collisions exist in the live data
// (measured 2026-09-02). Without the kind, a concordato preventivo listing
// matched whichever procedure happened to carry the same number -- which is
// the bug this key shape exists to prevent.
// Unlike OMI (omi.ts), there is no two-tier fallback: this is an exact-key
// lookup only, and it is not scope-restricted (relevant to both immobili
// and corporate listings).

const KEY_SEP = ' ';

/** DOMAIN_RULES.md §12 override table: PVP-side normalized spelling -> the
 *  source collection's own (already-normalized) abbreviated spelling, for
 *  historical court-seat mergers the two sources spell differently. */
export const PROCEDURA_TRIBUNALE_OVERRIDES: Readonly<Record<string, string>> = {
  'NAPOLI NORD IN AVERSA': 'NAPOLI NORD',
  'VICENZA EX BASSANO DEL GRAPPA': 'VICENZA EX BASSANO',
};

const TRIBUNALE_PREFIX_RE = /\bTRIBUNALE\b\s*(\(?\s*ORDINARIO\s*\)?\s*)?\bDI\b/g;
const NON_ALNUM_RE = /[^A-Z0-9]+/g;

/**
 * Normalizes a tribunale name to an ASCII, uppercase, punctuation-collapsed
 * comparison key: strips accents/apostrophes (`Forlì`/`Forli'` -> `FORLI`),
 * strips a `"Tribunale (ordinario) di"` / `"Tribunale di"` prefix, uppercases,
 * collapses whitespace, then applies the override table
 * (`DOMAIN_RULES.md` §12). Applied identically to a listing's own `tribunale`
 * and (in principle) to the source collection's `tribunale.nome` -- the
 * source collection already ships the result as `tribunale.chiave`, so this
 * function is used here only on the listing side before lookup.
 */
export function tribunaleKey(name: string | null | undefined): string {
  if (!name) return '';
  const asciiOnly = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics (same as omi.ts's slugComponent)
    .toUpperCase();
  const noPrefix = asciiOnly.replace(TRIBUNALE_PREFIX_RE, ' ');
  const collapsed = noPrefix.replace(NON_ALNUM_RE, ' ').trim().replace(/\s+/g, ' ');
  return PROCEDURA_TRIBUNALE_OVERRIDES[collapsed] ?? collapsed;
}

/** The two registers the source publishes, and the only kinds that can ever
 *  be matched. */
export const FAMIGLIE_PROCEDURA = ['F', 'LG'] as const;
export type FamigliaProcedura = (typeof FAMIGLIE_PROCEDURA)[number];

/**
 * A listing's own `tipo_procedura` mapped to the register it would live in,
 * or `null` when it has no counterpart in the source at all.
 *
 * The source publishes exactly two lists — fallimenti and liquidazioni
 * giudiziali. A listing that is a concordato preventivo, a liquidazione
 * coatta, a liquidazione controllata or an esecuzione has NO procedure to
 * match, and must never borrow one that merely shares a number.
 *
 * Prefix matching, not substring: "Liquidazione Volontaria - Giudiziale" is a
 * voluntary liquidation and contains the word "Giudiziale", but it is not a
 * liquidazione giudiziale and must not map to one.
 *
 * Anything unrecognised returns null — deliberately the safe direction. A
 * missed match costs a badge that does not appear; a wrong one puts another
 * company's debtor, tax code and curatore on an auction.
 */
export function famigliaProceduraListing(
  tipoProcedura: string | null | undefined,
): FamigliaProcedura | null {
  if (!tipoProcedura) return null;
  const t = tipoProcedura.trim().toLowerCase();
  if (t.startsWith('fallimentare') || t.startsWith('fallimento')) return 'F';
  if (t.startsWith('liquidazione giudiziale')) return 'LG';
  return null;
}

/**
 * The listing-side match key, or `null` (never a partial key) when any input
 * is null/empty or the listing's kind has no counterpart in the source --
 * the same "no partial-key matching" discipline `bloccoKey` uses (blocco.ts).
 */
export function proceduraMatchKey(
  tribunale: string | null | undefined,
  numero: string | null | undefined,
  anno: string | null | undefined,
  tipoProcedura: string | null | undefined,
): string | null {
  if (!tribunale || !numero || !anno) return null;
  const famiglia = famigliaProceduraListing(tipoProcedura);
  if (famiglia === null) return null;
  return [tribunaleKey(tribunale), numero, anno, famiglia].join(KEY_SEP);
}

export interface ProceduraConcorsualeDoc {
  id: string;
  nome: string;
  rg: { completo: string; numero: string; numero_base: string; anno: number } | null;
  data_dichiarazione: string | null;
  tipo_code: string | null;
  tipo_procedura: string | null;
  tribunale: { nome: string | null; chiave: string | null };
  professionista: string | null;
  giudice_delegato: string | null;
  debitore: {
    codice_fiscale: string | null;
    partita_iva: string | null;
    ragione_sociale: string | null;
    citta: string | null;
    indirizzo: string | null;
  } | null;
  link: string;
  estratto_il: string;
  scheda_letta_il: string | null;
}

/**
 * The same key shape as `proceduraMatchKey`, built from the document's own
 * already-normalized `tribunale.chiave`/`rg.numero_base`/`rg.anno` -- no
 * re-normalization needed on this side (`DATA_MODEL.md` §17.1). `null` when
 * the document lacks a parsed `rg` or a `tribunale.chiave` (an incomplete
 * source record -- skipped by the repository, never a lookup crash).
 */
export function proceduraDocKey(doc: ProceduraConcorsualeDoc): string | null {
  if (doc.rg == null || !doc.tribunale.chiave) return null;
  // A document whose register is unknown yields no key: it cannot be placed
  // in either list, so matching it would be a guess.
  if (doc.tipo_code !== 'F' && doc.tipo_code !== 'LG') return null;
  return [doc.tribunale.chiave, doc.rg.numero_base, String(doc.rg.anno), doc.tipo_code].join(
    KEY_SEP,
  );
}

export interface ProceduraConcorsualeSelection {
  nome: string;
  tipo_code: string | null;
  tipo_procedura: string | null;
  professionista: string | null;
  giudice_delegato: string | null;
  debitore: ProceduraConcorsualeDoc['debitore'];
  link: string;
  /** `true` once the detail page has been read (`scheda_letta_il` set) --
   *  `DATA_MODEL.md` §17.2's second "not yet" state. A match with
   *  `available: false` still renders (`nome`/`tipo_code`/`tribunale`), just
   *  without `debitore` facts -- never treated the same as "no match". */
  available: boolean;
}

function toSelection(doc: ProceduraConcorsualeDoc): ProceduraConcorsualeSelection {
  return {
    nome: doc.nome,
    tipo_code: doc.tipo_code,
    tipo_procedura: doc.tipo_procedura,
    professionista: doc.professionista,
    giudice_delegato: doc.giudice_delegato,
    debitore: doc.scheda_letta_il != null ? doc.debitore : null,
    link: doc.link,
    available: doc.scheda_letta_il != null,
  };
}

export interface ProceduraMatchParams {
  tribunale: string | null;
  numero: string | null;
  anno: string | null;
  /** The listing's own kind — decides WHICH register is consulted. */
  tipo_procedura: string | null;
}

/**
 * Selects the matched procedure to display, or `null` on no match / any
 * null input (`DATA_MODEL.md` §17.2's first "not yet" state: no match is
 * the default outcome for most listings, not an error).
 */
export function selectProceduraConcorsuale(
  byKey: Readonly<Record<string, ProceduraConcorsualeDoc>>,
  params: ProceduraMatchParams,
): ProceduraConcorsualeSelection | null {
  const key = proceduraMatchKey(
    params.tribunale,
    params.numero,
    params.anno,
    params.tipo_procedura,
  );
  if (key === null) return null;
  const doc = byKey[key];
  return doc ? toSelection(doc) : null;
}

/**
 * The table-row presence flag -- a match exists in the lookup map,
 * regardless of whether its detail has been read yet (`DOMAIN_RULES.md`
 * §12's "table indicator" rule). A thin wrapper so `toListingRow` doesn't
 * need the full selection shape just to compute a boolean.
 */
export function hasProceduraConcorsuale(
  byKey: Readonly<Record<string, ProceduraConcorsualeDoc>>,
  params: ProceduraMatchParams,
): boolean {
  const key = proceduraMatchKey(
    params.tribunale,
    params.numero,
    params.anno,
    params.tipo_procedura,
  );
  return key !== null && key in byKey;
}
