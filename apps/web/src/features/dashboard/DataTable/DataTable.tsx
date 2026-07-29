// Generic virtualized table (FRONTEND.md §4). PrimeReact 11 dropped
// `virtualscroller` (see HANDOFF_PHASE_4.md) — row windowing here is
// `@tanstack/react-virtual` over plain semantic HTML. `display: flex` on
// `<tr>` (for column-width control) can strip a browser's IMPLICIT table
// semantics in some engine/AT pairings, so every table part also carries an
// explicit ARIA role — belt and suspenders, not a guess (UI §11
// accessibility requirement). Sticky header (vertical scroll) and the frozen
// actions column (horizontal scroll) both use `position: sticky` against the
// same scrolling container — verified in a real browser, not assumed.
//
// The actions column (UI §4.1/§4.5) always carries: the shared Valutazione
// control (also marking the row via `data-rating`, UI §5), a link opening the
// listing workspace, a quick-chat link (opens the workspace on its chat tab,
// UI §6.1 — carrying that thread's own unread count, capped 9+, same display
// rule as the user-menu badge), and "Vai all'annuncio →". The workspace links
// carry `search` built from the caller's own already-resolved `AreaSearch`
// object (a `search` prop here), not a `(prev) => ...` router callback —
// `<Link>` embedded in a route-context-agnostic component like this one can't
// have `prev` inferred against a specific route's search type, which `tsc`
// rejects the moment the target route's schema has required fields
// (`cluster`/`tab`/`dir`, all `.catch()`-defaulted but still required in the
// parsed output type).
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AreaSlug, ThreadListItem } from '@pvp/shared';
import type { AreaSearch, SortDir, SortKey } from '../urlState.js';
import type { ColumnContext, ColumnDef, TableRow } from './columns.js';
import { RatingControl } from '../../ratings/RatingControl.js';
import type { RatingsMap } from '../../ratings/join.js';
import './dataTable.css';

const ROW_HEIGHT_PX = 48;
const VIEWPORT_HEIGHT_PX = 560;
const ACTIONS_COLUMN_WIDTH = '260px';

export interface DataTableProps {
  rows: readonly TableRow[];
  columns: readonly ColumnDef[];
  columnContext: ColumnContext;
  ratings: RatingsMap;
  chatsByListing: ReadonlyMap<string, ThreadListItem>;
  area: AreaSlug;
  search: AreaSearch;
  sortKey: SortKey | undefined;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  emptyMessage: string;
}

export function DataTable({
  rows,
  columns,
  columnContext,
  ratings,
  chatsByListing,
  area,
  search,
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
            const rating = ratings.get(row.id) ?? null;
            const unread = chatsByListing.get(row.id)?.unread ?? 0;
            const rowArea = row.area ?? area;
            return (
              <tr
                key={row.id}
                role="row"
                className="data-table-row data-table-body-row"
                data-rating={rating ?? undefined}
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
                  <RatingControl listingId={row.id} value={rating} compact />
                  <Link
                    to="/aste/$area/lotto/$id"
                    params={{ area: rowArea, id: row.id }}
                    search={{ ...search, pannello: 'dettagli' }}
                    className="data-table-action-link"
                    title={t('table.openWorkspace')}
                  >
                    {t('table.openWorkspace')}
                  </Link>
                  <Link
                    to="/aste/$area/lotto/$id"
                    params={{ area: rowArea, id: row.id }}
                    search={{ ...search, pannello: 'chat' }}
                    className="data-table-action-link"
                    title={t('table.quickChat')}
                  >
                    {t('table.quickChat')}
                    {unread > 0 ? (
                      <span
                        className="data-table-chat-badge"
                        aria-label={t('common:userMenu.unread', { count: unread })}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : null}
                  </Link>
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
