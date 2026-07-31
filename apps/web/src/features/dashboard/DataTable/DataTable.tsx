// Generic virtualized table (FRONTEND.md §4, redesigned in Execution Plan
// Phase 13). Row windowing is `@tanstack/react-virtual` over plain semantic
// HTML. `display: flex` on `<tr>` (for column-width control) can strip a
// browser's IMPLICIT table semantics in some engine/AT pairings, so every
// table part also carries an explicit ARIA role — belt and suspenders, not
// a guess (UI §11 accessibility requirement). Sticky header (vertical
// scroll) and the frozen actions column (horizontal scroll) both use
// `position: sticky` against the same scrolling container — verified in a
// real browser, not assumed.
//
// Phase 13 actions model (UI §4.1/§4.5): the whole row is clickable and
// opens the listing workspace on Dettagli (the row's links remain the
// keyboard path); the frozen actions cell carries the primary "Apri scheda"
// link-button and a "⋯" overflow menu (Storico / Apri chat with its
// thread's unread badge, capped 9+ / Vai all'annuncio, external) — labels
// are never truncated. Rating editing moved to the workspace drawer; rows
// show the read-only dot in the identity column (columns.tsx) plus the
// row-level `data-rating` tinting. The workspace links carry `search` built
// from the caller's own already-resolved `AreaSearch` object (a `search`
// prop here), not a `(prev) => ...` router callback — `<Link>` embedded in
// a route-context-agnostic component like this one can't have `prev`
// inferred against a specific route's search type.
import { useRef, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  History,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import type { AreaSlug, ThreadListItem } from '@pvp/shared';
import type { AreaSearch, SortDir, SortKey } from '../urlState.js';
import type { ColumnContext, ColumnDef, TableRow } from './columns.js';
import type { RatingsMap } from '../../ratings/join.js';
import { StatusDisplay } from '../../../components/StatusDisplay.js';
import { Button } from '../../../components/Button.js';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../../../components/DropdownMenu.js';
import './dataTable.css';

const ROW_HEIGHT_PX = 56;
const VIEWPORT_HEIGHT_PX = 560;
const ACTIONS_COLUMN_WIDTH = '166px';

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
  /** Renders an "Azzera filtri" action in the empty state when provided
   *  (i.e. when the emptiness can be caused by active filters). */
  onEmptyReset?: () => void;
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
  onEmptyReset,
}: DataTableProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 12,
    getItemKey: (index) => rows[index]!.id,
  });

  if (rows.length === 0) {
    return (
      <StatusDisplay
        variant="empty"
        layout="block"
        className="data-table-empty"
        title={t('table.emptyTitle')}
        message={emptyMessage}
        action={
          onEmptyReset ? (
            <Button severity="primary" onClick={onEmptyReset}>
              {t('table.emptyResetAction')}
            </Button>
          ) : undefined
        }
      />
    );
  }

  function openWorkspace(rowArea: AreaSlug, id: string, pannello: 'dettagli' | 'chat') {
    void navigate({
      to: '/aste/$area/lotto/$id',
      params: { area: rowArea, id },
      search: { ...search, pannello },
    });
  }

  /** Row click opens the scheda — but never steals clicks that landed on a
   *  real interactive element inside the row (links, buttons, the menu). */
  function handleRowClick(event: MouseEvent, rowArea: AreaSlug, id: string) {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, [role="menu"], [role="dialog"]')) return;
    openWorkspace(rowArea, id, 'dettagli');
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
                className={`data-table-cell${col.align === 'right' ? ' data-table-cell-right' : ''}`}
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
                      sortDir === 'asc' ? (
                        <ArrowUp aria-hidden="true" size={14} />
                      ) : (
                        <ArrowDown aria-hidden="true" size={14} />
                      )
                    ) : null}
                  </button>
                ) : (
                  t(col.headerKey)
                )}
              </th>
            ))}
            <th
              role="columnheader"
              className="data-table-cell data-table-cell-right data-table-actions-cell"
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
                onClick={(event) => handleRowClick(event, rowArea, row.id)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    role="cell"
                    className={`data-table-cell${col.align === 'right' ? ' data-table-cell-right' : ''}`}
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
                  <Link
                    to="/aste/$area/lotto/$id"
                    params={{ area: rowArea, id: row.id }}
                    search={{ ...search, pannello: 'dettagli' }}
                    className="data-table-open-button"
                    onClick={(e) => e.currentTarget.focus()}
                  >
                    {t('table.openWorkspace')}
                  </Link>
                  <MenuRoot>
                    <MenuTrigger asChild>
                      <Button
                        severity="secondary"
                        size="icon"
                        aria-label={t('table.moreActions')}
                        title={t('table.moreActions')}
                        className="data-table-more-button"
                      >
                        <MoreHorizontal aria-hidden="true" size={16} />
                        {unread > 0 ? (
                          <span
                            className="data-table-chat-badge"
                            aria-label={t('common:userMenu.unread', { count: unread })}
                          >
                            {unread > 9 ? '9+' : unread}
                          </span>
                        ) : null}
                      </Button>
                    </MenuTrigger>
                    <MenuContent align="end">
                      <MenuItem
                        onSelect={() => {
                          openWorkspace(rowArea, row.id, 'chat');
                        }}
                      >
                        <MessageSquare aria-hidden="true" size={16} />
                        {t('table.quickChat')}
                        {unread > 0 ? (
                          <span className="data-table-chat-badge data-table-chat-badge-menu">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        ) : null}
                      </MenuItem>
                      <MenuItem
                        onSelect={() => {
                          void navigate({
                            to: '/aste/$area/lotto/$id',
                            params: { area: rowArea, id: row.id },
                            search: { ...search, pannello: 'storico' },
                          });
                        }}
                      >
                        <History aria-hidden="true" size={16} />
                        {t('table.openHistory')}
                      </MenuItem>
                      <MenuItem asChild>
                        <a href={row.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink aria-hidden="true" size={16} />
                          {t('table.goToListing')}
                        </a>
                      </MenuItem>
                    </MenuContent>
                  </MenuRoot>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
