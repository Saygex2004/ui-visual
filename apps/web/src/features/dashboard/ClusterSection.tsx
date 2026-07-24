// Cluster section (UI §3.1): header + subtitle, bucket tabs, the active
// table. Region controls (UI §3.2 drill-down) are Phase 5 — every cluster is
// shown uniformly here via its character/subtitle text, no region chips yet.
// Owns the INNER `TabsRoot` (principali/fallimenti), lazy-mounted so only the
// active bucket's table is ever in the DOM.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TabsRoot, TabsPanels, TabsPanel } from 'primereact/tabs';
import type { ClusterBlock, BloccoIndexEntry } from '@pvp/shared';
import type { AreaSearch, BucketTab, SortKey } from './urlState.js';
import { applyFilterModel, distinctValues } from './filterModel.js';
import { BucketTabs } from './BucketTabs.js';
import { Toolbar } from './DataTable/Toolbar.js';
import { DataTable } from './DataTable/DataTable.js';
import { getColumns, type AreaTableKind } from './DataTable/columns.js';

export interface ClusterSectionProps {
  cluster: ClusterBlock;
  areaKind: AreaTableKind;
  bloccoIndex: Readonly<Record<string, BloccoIndexEntry>>;
  search: AreaSearch;
  onPatch: (patch: Partial<AreaSearch>, opts?: { replace?: boolean }) => void;
  onReset: () => void;
}

export function ClusterSection({
  cluster,
  areaKind,
  bloccoIndex,
  search,
  onPatch,
  onReset,
}: ClusterSectionProps) {
  const { t } = useTranslation('dashboard');
  const columns = useMemo(() => getColumns(areaKind), [areaKind]);

  const principali = useMemo(
    () => applyFilterModel(cluster.buckets.principali, search),
    [cluster, search],
  );
  const fallimenti = useMemo(
    () => applyFilterModel(cluster.buckets.fallimenti, search),
    [cluster, search],
  );

  const activeBucketRows =
    search.tab === 'fallimenti' ? cluster.buckets.fallimenti : cluster.buckets.principali;
  const tipoOptions = useMemo(
    () => distinctValues(activeBucketRows, 'tipo_bene'),
    [activeBucketRows],
  );
  const proceduraOptions = useMemo(
    () => distinctValues(activeBucketRows, 'tipo_procedura'),
    [activeBucketRows],
  );
  const disponibilitaOptions = useMemo(
    () => distinctValues(activeBucketRows, 'disponibilita'),
    [activeBucketRows],
  );
  const tribunaleOptions = useMemo(
    () => distinctValues(activeBucketRows, 'tribunale'),
    [activeBucketRows],
  );

  function handleSort(key: SortKey) {
    const nextDir = search.sort === key && search.dir === 'asc' ? 'desc' : 'asc';
    onPatch({ sort: key, dir: nextDir });
  }

  return (
    <section className="cluster-section" aria-labelledby={`cluster-title-${cluster.key}`}>
      <h2 id={`cluster-title-${cluster.key}`} className="cluster-section-title">
        {t('cluster.title', { number: cluster.number, name: t(`cluster.name.${cluster.key}`) })}
      </h2>
      <p className="cluster-section-subtitle">{t(`cluster.subtitle.${cluster.key}`)}</p>

      <TabsRoot
        value={search.tab}
        onValueChange={(e: { value: string | number | undefined }) =>
          onPatch({ tab: e.value as BucketTab })
        }
        lazy
      >
        <BucketTabs
          principaliCount={principali.totalCount}
          fallimentiCount={fallimenti.totalCount}
        />
        <Toolbar
          areaKind={areaKind}
          search={search}
          onPatch={onPatch}
          onReset={onReset}
          visibleCount={
            search.tab === 'fallimenti' ? fallimenti.visibleCount : principali.visibleCount
          }
          totalCount={search.tab === 'fallimenti' ? fallimenti.totalCount : principali.totalCount}
          tipoOptions={tipoOptions}
          proceduraOptions={proceduraOptions}
          disponibilitaOptions={disponibilitaOptions}
          tribunaleOptions={tribunaleOptions}
        />
        <TabsPanels>
          <TabsPanel value="principali">
            <DataTable
              rows={principali.rows}
              columns={columns}
              bloccoIndex={bloccoIndex}
              sortKey={search.sort}
              sortDir={search.dir}
              onSort={handleSort}
              emptyMessage={t('table.empty')}
            />
          </TabsPanel>
          <TabsPanel value="fallimenti">
            <DataTable
              rows={fallimenti.rows}
              columns={columns}
              bloccoIndex={bloccoIndex}
              sortKey={search.sort}
              sortDir={search.dir}
              onSort={handleSort}
              emptyMessage={t('table.empty')}
            />
          </TabsPanel>
        </TabsPanels>
      </TabsRoot>
    </section>
  );
}
