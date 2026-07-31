// Intl it-IT formatting for table cells (UI §4.1) — a consistent N/D fallback
// for every absent value.
export const NOT_AVAILABLE = 'N/D';

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timestampFormatter = new Intl.DateTimeFormat('it-IT', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCurrency(value: number | null): string {
  return value == null ? NOT_AVAILABLE : currencyFormatter.format(value);
}

/** `data_pubblicazione`/`data_vendita` are `YYYY-MM-DD`, timezone-less by
 *  contract (DOMAIN_RULES.md §11) — parsed as a local calendar date, never
 *  through `new Date(isoString)`, which would read it as UTC midnight and
 *  can shift the displayed day backward in negative-UTC-offset zones. */
export function formatDate(isoDate: string | null): string {
  if (isoDate == null) return NOT_AVAILABLE;
  const [year, month, day] = isoDate.split('-').map(Number);
  if (year == null || month == null || day == null || Number.isNaN(day)) return NOT_AVAILABLE;
  return dateFormatter.format(new Date(year, month - 1, day));
}

/** `meta.last_success_at`, `omi.fetched_at` etc. are full ISO-8601 UTC
 *  instants (API_CONTRACT.md §1) — a genuine `new Date(iso)` parse is
 *  correct here, unlike the date-only fields above. */
export function formatTimestamp(isoInstant: string | null): string {
  if (isoInstant == null) return NOT_AVAILABLE;
  const date = new Date(isoInstant);
  return Number.isNaN(date.getTime()) ? NOT_AVAILABLE : timestampFormatter.format(date);
}

/** Same instant-parsing as `formatTimestamp`, date-only display (e.g. an
 *  account's `created_at` in a table column that has no room for a time). */
export function formatTimestampDate(isoInstant: string | null): string {
  if (isoInstant == null) return NOT_AVAILABLE;
  const date = new Date(isoInstant);
  return Number.isNaN(date.getTime()) ? NOT_AVAILABLE : dateFormatter.format(date);
}

export function formatText(value: string | null | undefined): string {
  return value == null || value.length === 0 ? NOT_AVAILABLE : value;
}

export function formatComuneProvincia(comune: string | null, provincia: string | null): string {
  if (comune == null) return NOT_AVAILABLE;
  return provincia == null ? comune : `${comune} (${provincia})`;
}

export function formatNumeroAnno(numero: string | null, anno: string | null): string {
  if (numero == null && anno == null) return NOT_AVAILABLE;
  return `${numero ?? NOT_AVAILABLE}/${anno ?? NOT_AVAILABLE}`;
}
