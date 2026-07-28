// Cluster section (UI §3.1): header + subtitle, the geographic drill-down +
// OMI panel for clusters that map to regions (UI §3.2/§3.3), bucket tabs, the
// active table. Owns the INNER `TabsRoot` (principali/fallimenti),
// lazy-mounted so only the active bucket's table is ever in the DOM. Scrolls
// itself into view whenever a blocco isolation is active — covers both a
// same-cluster isolate click (a harmless no-op nudge) and landing here via a
// cross-cluster jump (UI §4.4: "brings it into view"), honouring reduced
// motion since `scrollIntoView`'s `behavior` bypasses CSS `scroll-behavior`.
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TabsRoot, TabsPanels, TabsPanel } from 'primereact/tabs';
import {
  REAL_ESTATE_CLUSTERS,
  type AreaSlug,
  type ClusterBlock,
  type BloccoIndexEntry,
  type OmiEntry,
} from '@pvp/shared';
import type { AreaSearch, BucketTab, SortKey } from './urlState.js';
import { applyFilterModel, distinctValues } from './filterModel.js';
import { BucketTabs } from './BucketTabs.js';
import { DrillDown } from './DrillDown.js';
import { OmiPanel } from './OmiPanel.js';
import { Toolbar } from './DataTable/Toolbar.js';
import { DataTable } from './DataTable/DataTable.js';
import { getColumns, type AreaTableKind, type ColumnContext } from './DataTable/columns.js';
import type { RatingsMap } from '../ratings/join.js';

export interface ClusterSectionProps {
  cluster: ClusterBlock;
  clusters: readonly ClusterBlock[];
  areaKind: AreaTableKind;
  area: AreaSlug;
  ratings: RatingsMap;
  bloccoIndex: Readonly<Record<string, BloccoIndexEntry>>;
  omiByComune: Readonly<Record<string, OmiEntry>>;
  search: AreaSearch;
  onPatch: (patch: Partial<AreaSearch>, opts?: { replace?: boolean }) => void;
  onReset: () => void;
  onIsolate: (bloccoKey: string) => void;
  onJump: (targetClusterKey: string, bloccoKey: string) => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export function ClusterSection({
  cluster,
  clusters,
  areaKind,
  area,
  ratings,
  bloccoIndex,
  omiByComune,
  search,
  onPatch,
  onReset,
  onIsolate,
  onJump,
}: ClusterSectionProps) {
  const { t } = useTranslation('dashboard');
  const columns = useMemo(() => getColumns(areaKind), [areaKind]);
  const sectionRef = useRef<HTMLElement>(null);

  const hasGeography = useMemo(() => {
    if (areaKind !== 'real_estate') return false;
    const def = REAL_ESTATE_CLUSTERS.find((c) => c.key === cluster.key);
    return (def?.regions.length ?? 0) > 0;
  }, [areaKind, cluster.key]);

  const allRows = useMemo(
    () => [...cluster.buckets.principali, ...cluster.buckets.fallimenti],
    [cluster],
  );

  const columnContext: ColumnContext = useMemo(
    () => ({
      bloccoIndex,
      activeBlocco: search.blocco ?? null,
      currentClusterKey: cluster.key,
      clusters,
      onIsolate,
      onJump,
    }),
    [bloccoIndex, search.blocco, cluster.key, clusters, onIsolate, onJump],
  );

  useEffect(() => {
    if (search.blocco) {
      sectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }, [search.blocco]);

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
    <section
      className="cluster-section"
      aria-labelledby={`cluster-title-${cluster.key}`}
      ref={sectionRef}
    >
      <h2 id={`cluster-title-${cluster.key}`} className="cluster-section-title">
        {t('cluster.title', { number: cluster.number, name: t(`cluster.name.${cluster.key}`) })}
      </h2>
      <p className="cluster-section-subtitle">{t(`cluster.subtitle.${cluster.key}`)}</p>

      {hasGeography ? (
        <>
          <DrillDown rows={allRows} search={search} onPatch={onPatch} />
          <OmiPanel rows={allRows} omiByComune={omiByComune} search={search} />
        </>
      ) : null}

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
              columnContext={columnContext}
              ratings={ratings}
              area={area}
              search={search}
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
              columnContext={columnContext}
              ratings={ratings}
              area={area}
              search={search}
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
