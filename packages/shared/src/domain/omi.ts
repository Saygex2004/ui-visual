// OMI selection & keying (DOMAIN_RULES.md §9, DATA_MODEL.md §4). The reference
// is always residential; the caption honesty is the UI's job. Here we only
// pick the right document and expose the composite slug id.

export interface OmiDoc {
  provincia: string;
  comune: string;
  tipologia: string | null;
  stato: string | null;
  min_mq: number | null;
  max_mq: number | null;
  zona: string | null;
  semestre: string;
  error: string | null;
}

export interface OmiSelection {
  provincia: string;
  comune: string;
  tipologia: string | null;
  stato: string | null;
  min_mq: number | null;
  max_mq: number | null;
  zona: string | null;
  semestre: string;
  available: true;
}

/** Slugify one component: lowercase, strip accents, collapse non-alnum to `-`. */
export function slugComponent(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Composite document id `{slug(provincia)}-{slug(comune)}` (DATA_MODEL.md §4). */
export function omiSlug(provincia: string, comune: string): string {
  return `${slugComponent(provincia)}-${slugComponent(comune)}`;
}

function usable(doc: OmiDoc | undefined): doc is OmiDoc {
  return doc !== undefined && doc.error === null;
}

function toSelection(doc: OmiDoc): OmiSelection {
  return {
    provincia: doc.provincia,
    comune: doc.comune,
    tipologia: doc.tipologia,
    stato: doc.stato,
    min_mq: doc.min_mq,
    max_mq: doc.max_mq,
    zona: doc.zona,
    semestre: doc.semestre,
    available: true,
  };
}

/**
 * Select the OMI entry to display (§9): the listing's own comune document when
 * usable, else its province-capital document. An `error`-marked doc and an
 * absent doc are both "not available" (rendered identically to the user) — they
 * are skipped and the fallback tried; if neither is usable, returns null.
 */
export function selectOmiEntry(
  omiBySlug: Readonly<Record<string, OmiDoc>>,
  params: { provincia: string | null; comune: string | null; capitalComune?: string | null },
): OmiSelection | null {
  const { provincia, comune, capitalComune } = params;
  if (provincia == null) return null;

  if (comune != null) {
    const doc = omiBySlug[omiSlug(provincia, comune)];
    if (usable(doc)) return toSelection(doc);
  }

  if (capitalComune != null && capitalComune !== comune) {
    const capital = omiBySlug[omiSlug(provincia, capitalComune)];
    if (usable(capital)) return toSelection(capital);
  }

  return null;
}
