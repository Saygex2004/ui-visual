// Capital-comune identification (UI §3.2 drill-down, DOMAIN_RULES.md §9). No
// static Italy-wide province→capital table exists or is needed: a capital is
// identified from the area's own listing data, matching UI §3.2's own framing
// ("built from the region's actual listings"). Verified against the real
// fixture set (seed/fixtures/listings.json): every row where `comune` equals
// `provincia` is a genuine provincial capital (Roma/Roma, Bari/Bari, Milano/
// Milano...); every row where they differ is a deliberate non-capital case
// (Tivoli vs Roma, Modugno vs Bari, and Roccaraso vs L'Aquila — the latter is
// also the UI Appendix B Easter egg comune, unrelated to this function).

export function isCapitalComune(row: { comune: string | null; provincia: string | null }): boolean {
  return row.comune != null && row.provincia != null && row.comune === row.provincia;
}
