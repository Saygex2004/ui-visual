// Small HTTP helpers shared across route modules that implement the
// API_CONTRACT.md §10 polling contract's "cheap path" (ETag/304).
export function firstHeaderValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
