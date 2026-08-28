// Formatting shared by the on-screen preview and the Word generator.
//
// These lived as two copies, one per file, and had already drifted: the date
// formatter was byte-identical, but formatEuro returned '___' in the preview
// and '' in the document. That difference is deliberate — the preview marks a
// missing amount so you can see what is still to fill in, while the document
// leaves it blank — so it survives here as a named parameter instead of as
// two implementations nobody was comparing.

const MESI = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

/** `2026-08-27` → `27 agosto 2026`; the blank line when there is no date. */
export function formatDateItalian(dateStr: string | null | undefined): string {
  if (!dateStr) return '___________';
  // Parsed at local midnight, never through `new Date(iso)`, which reads a
  // bare date as UTC and can shift the day backwards west of Greenwich.
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * An amount with Italian thousands separators and two decimals.
 * `vuoto` is what an absent amount renders as: '' in the document, '___' in
 * the preview.
 */
export function formatEuro(val: string | number | null | undefined, vuoto = ''): string {
  return val
    ? parseFloat(String(val)).toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : vuoto;
}

/** Whether a body was written as rich text rather than plain. */
export function isHtml(s: string | null | undefined): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s || '');
}
