// Archivio section (UI §9.1): the per-area archive from the snapshot's
// archive rows plus same-session past-sale moves (§9.2), reusing the same
// generic table with the Cluster-of-origin column added. Its own reduced
// toolbar (search, value range, reset, sort — explicitly NO column choosers,
// and no geographic filter either per UI §9.1) — no bucket split, one flat
// table. The empty-state message is about the COMBINED row set being empty,
// never about the current filter narrowing it to zero (that's `table.empty`,
// same as any other table).
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ArchiveRow, BloccoIndexEntry, ClusterBlock } from '@pvp/shared';
import type { AreaSearch, SortKey } from './urlState.js';
import { applyFilterModel } from './filterModel.js';
import { Toolbar } from './DataTable/Toolbar.js';
import { DataTable } from './DataTable/DataTable.js';
import { getColumns, type AreaTableKind, type ColumnContext } from './DataTable/columns.js';

export interface ArchiveSectionProps {
  rows: readonly ArchiveRow[];
  clusters: readonly ClusterBlock[];
  areaKind: AreaTableKind;
  bloccoIndex: Readonly<Record<string, BloccoIndexEntry>>;
  search: AreaSearch;
  onPatch: (patch: Partial<AreaSearch>, opts?: { replace?: boolean }) => void;
  onReset: () => void;
  onIsolate: (bloccoKey: string) => void;
  onJump: (targetClusterKey: string, bloccoKey: string) => void;
  onSvuota: () => void;
}

export function ArchiveSection({
  rows,
  clusters,
  areaKind,
  bloccoIndex,
  search,
  onPatch,
  onReset,
  onIsolate,
  onJump,
  onSvuota,
}: ArchiveSectionProps) {
  const { t } = useTranslation('dashboard');
  const columns = useMemo(() => getColumns(areaKind, { showClusterColumn: true }), [areaKind]);
  const filtered = useMemo(
    () => applyFilterModel(rows, search, { includeGeo: false }),
    [rows, search],
  );
  const columnContext: ColumnContext = useMemo(
    () => ({
      bloccoIndex,
      activeBlocco: search.blocco ?? null,
      currentClusterKey: null,
      clusters,
      onIsolate,
      onJump,
    }),
    [bloccoIndex, search.blocco, clusters, onIsolate, onJump],
  );

  function handleSort(key: SortKey) {
    const nextDir = search.sort === key && search.dir === 'asc' ? 'desc' : 'asc';
    onPatch({ sort: key, dir: nextDir });
  }

  return (
    <section className="cluster-section" aria-labelledby="archive-title">
      <div className="archive-section-header">
        <h2 id="archive-title" className="cluster-section-title">
          {t('archive.title')}
        </h2>
        <button type="button" className="archive-svuota-control" onClick={onSvuota}>
          {t('archive.svuotaControl')}
        </button>
      </div>
      <Toolbar
        areaKind={areaKind}
        search={search}
        onPatch={onPatch}
        onReset={onReset}
        visibleCount={filtered.visibleCount}
        totalCount={filtered.totalCount}
      />
      <DataTable
        rows={filtered.rows}
        columns={columns}
        columnContext={columnContext}
        sortKey={search.sort}
        sortDir={search.dir}
        onSort={handleSort}
        emptyMessage={rows.length === 0 ? t('archive.empty') : t('table.empty')}
      />
    </section>
  );
}
