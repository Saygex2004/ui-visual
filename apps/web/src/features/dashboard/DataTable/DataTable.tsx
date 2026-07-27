// Generic virtualized table (FRONTEND.md §4). PrimeReact 11 dropped
// `virtualscroller` (see HANDOFF_PHASE_4.md) — row windowing here is
// `@tanstack/react-virtual` over plain semantic HTML. `display: flex` on
// `<tr>` (for column-width control) can strip a browser's IMPLICIT table
// semantics in some engine/AT pairings, so every table part also carries an
// explicit ARIA role — belt and suspenders, not a guess (UI §11
// accessibility requirement). Sticky header (vertical scroll) and the frozen
// actions column (horizontal scroll) both use `position: sticky` against the
// same scrolling container — verified in a real browser, not assumed.
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SortDir, SortKey } from '../urlState.js';
import type { ColumnContext, ColumnDef, TableRow } from './columns.js';
import './dataTable.css';

const ROW_HEIGHT_PX = 48;
const VIEWPORT_HEIGHT_PX = 560;
const ACTIONS_COLUMN_WIDTH = '130px';

export interface DataTableProps {
  rows: readonly TableRow[];
  columns: readonly ColumnDef[];
  columnContext: ColumnContext;
  sortKey: SortKey | undefined;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  emptyMessage: string;
}

export function DataTable({
  rows,
  columns,
  columnContext,
  sortKey,
  sortDir,
  onSort,
  emptyMessage,
}: DataTableProps) {
  const { t } = useTranslation('dashboard');
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 12,
    getItemKey: (index) => rows[index]!.id,
  });

  if (rows.length === 0) {
    return <p className="data-table-empty">{emptyMessage}</p>;
  }

  return (
    <div className="data-table-scroll" ref={scrollRef} style={{ height: VIEWPORT_HEIGHT_PX }}>
      <table className="data-table" role="table">
        <thead className="data-table-head" role="rowgroup">
          <tr className="data-table-row data-table-head-row" role="row">
            {columns.map((col) => (
              <th
                key={col.key}
                role="columnheader"
                className="data-table-cell"
                style={{ flexBasis: col.width }}
                aria-sort={
                  col.sortKey == null
                    ? undefined
                    : col.sortKey === sortKey
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                }
              >
                {col.sortKey ? (
                  <button
                    type="button"
                    className="data-table-sort-button"
                    onClick={() => onSort(col.sortKey as SortKey)}
                  >
                    {t(col.headerKey)}
                    {col.sortKey === sortKey ? (
                      <span aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                    ) : null}
                  </button>
                ) : (
                  t(col.headerKey)
                )}
              </th>
            ))}
            <th
              role="columnheader"
              className="data-table-cell data-table-actions-cell"
              style={{ flexBasis: ACTIONS_COLUMN_WIDTH }}
            >
              {t('table.columns.actions')}
            </th>
          </tr>
        </thead>
        <tbody
          className="data-table-body"
          role="rowgroup"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]!;
            return (
              <tr
                key={row.id}
                role="row"
                className="data-table-row data-table-body-row"
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    role="cell"
                    className="data-table-cell"
                    style={{ flexBasis: col.width }}
                  >
                    {col.render(row, columnContext)}
                  </td>
                ))}
                <td
                  role="cell"
                  className="data-table-cell data-table-actions-cell"
                  style={{ flexBasis: ACTIONS_COLUMN_WIDTH }}
                >
                  <a
                    href={row.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="data-table-annuncio-link"
                  >
                    {t('table.goToListing')}
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
