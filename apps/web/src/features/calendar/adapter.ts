// CalendarRow → TableRow adapter (UI §7.2) — lets the day view reuse
// DataTable.tsx/columns.tsx unchanged (FRONTEND.md §4's "one table component,
// declarative column sets"). CalendarRow is a strict subset of ListingRow's
// fields plus `area`; the handful ListingRow has and CalendarRow doesn't
// (numero/anno/data_pubblicazione/descrizione_excerpt/archived_at/band/
// has_procedura_concorsuale) are filled with harmless placeholders —
// CALENDAR_COLUMNS never renders them (Phase 14 deliberately excluded the
// procedura-concorsuale indicator from the calendar's tight column budget).
import { priceBand, type CalendarRow } from '@pvp/shared';
import type { TableRow } from '../dashboard/DataTable/columns.js';

export function toTableRow(row: CalendarRow): TableRow {
  return {
    ...row,
    descrizione_excerpt: '',
    numero: null,
    anno: null,
    data_pubblicazione: null,
    archived_at: null,
    band: priceBand(row.valore_richiesto),
    has_procedura_concorsuale: false,
  };
}
