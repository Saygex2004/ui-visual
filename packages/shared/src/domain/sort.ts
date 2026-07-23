// Sort comparators (DOMAIN_RULES.md §4.2 / UI §4.2). Ascending-order
// comparators; callers negate for descending. Deliberate asymmetry with price
// banding: for SORTING, missing values are lowest (here); for BANDING, null is
// the middle band (priceBand).

/** Value sort — nulls treated as lowest (UI §4.2). */
export function compareValore(a: number | null | undefined, b: number | null | undefined): number {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return 0;
  if (an === null) return -1; // null is lowest
  if (bn === null) return 1;
  return an - bn;
}

/** Date sort — chronological over `YYYY-MM-DD`; nulls lowest. */
export function compareData(a: string | null | undefined, b: string | null | undefined): number {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return 0;
  if (an === null) return -1;
  if (bn === null) return 1;
  return an < bn ? -1 : an > bn ? 1 : 0;
}

/**
 * Blocco-identity sort — orders by block key so the lots of one proceeding
 * become adjacent (UI §4.2). Ungrouped rows (null key) sort last, together.
 */
export function compareBloccoKey(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return 0;
  if (an === null) return 1; // ungrouped last
  if (bn === null) return -1;
  return an < bn ? -1 : an > bn ? 1 : 0;
}
