// Archivio section (UI §9.1): the per-area archive from the snapshot's
// archive rows, reusing the same generic table with the Cluster-of-origin
// column added. Its own reduced toolbar (search, value range, reset, sort —
// explicitly NO column choosers per UI §9.1) — no bucket split either, one
// flat table. No same-session past-sale handling ("Aggiorna alla data
// odierna") and no "Svuota archivio" yet — both Phase 5.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ArchiveRow, BloccoIndexEntry } from '@pvp/shared';
import type { AreaSearch, SortKey } from './urlState.js';
import { applyFilterModel } from './filterModel.js';
import { Toolbar } from './DataTable/Toolbar.js';
import { DataTable } from './DataTable/DataTable.js';
import { getColumns, type AreaTableKind } from './DataTable/columns.js';

export interface ArchiveSectionProps {
  rows: readonly ArchiveRow[];
  areaKind: AreaTableKind;
  bloccoIndex: Readonly<Record<string, BloccoIndexEntry>>;
  search: AreaSearch;
  onPatch: (patch: Partial<AreaSearch>, opts?: { replace?: boolean }) => void;
  onReset: () => void;
}

export function ArchiveSection({
  rows,
  areaKind,
  bloccoIndex,
  search,
  onPatch,
  onReset,
}: ArchiveSectionProps) {
  const { t } = useTranslation('dashboard');
  const columns = useMemo(() => getColumns(areaKind, { showClusterColumn: true }), [areaKind]);
  const filtered = useMemo(() => applyFilterModel(rows, search), [rows, search]);

  function handleSort(key: SortKey) {
    const nextDir = search.sort === key && search.dir === 'asc' ? 'desc' : 'asc';
    onPatch({ sort: key, dir: nextDir });
  }

  return (
    <section className="cluster-section" aria-labelledby="archive-title">
      <h2 id="archive-title" className="cluster-section-title">
        {t('archive.title')}
      </h2>
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
        bloccoIndex={bloccoIndex}
        sortKey={search.sort}
        sortDir={search.dir}
        onSort={handleSort}
        emptyMessage={t('archive.empty')}
      />
    </section>
  );
}
