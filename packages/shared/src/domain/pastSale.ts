// Same-session past-sale rule (DOMAIN_RULES.md §11 / UI §9.2). A row moves to
// the session Archivio when `data_vendita < today` in the VIEWER's timezone —
// a plain string comparison of `YYYY-MM-DD` (the dates are timezone-less by
// contract). A null `data_vendita` is NEVER moved. Pure; writes nothing.

export function isPastSale(dataVendita: string | null | undefined, viewerToday: string): boolean {
  if (dataVendita == null) return false;
  return dataVendita < viewerToday;
}
