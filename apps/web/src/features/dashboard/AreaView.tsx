// Area view (UI §2.3): back control + header + cluster nav + the active
// section (a cluster, or Archivio), one at a time. Owns the outer, lazy
// `TabsRoot` (only the active section's table(s) are ever mounted) and the
// single `useSearch`/`useNavigate` pair every child reads/writes through —
// `urlState.ts`'s schema is the single source of truth (FRONTEND.md §3).
// Cluster nav entries come from `snapshot.clusters` itself (always one entry
// per cluster definition, even empty ones — apps/server/src/cache/build.ts
// pre-seeds every cluster before placing listings) rather than a second,
// separately-imported constant, so nav and panels can never diverge.
import { useMemo } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { TabsRoot, TabsPanels, TabsPanel } from 'primereact/tabs';
import type { AreaSlug } from '@pvp/shared';
import { useAreaSnapshot } from './hooks.js';
import { resolveClusterSelector, type AreaSearch } from './urlState.js';
import { AreaHeader } from './AreaHeader.js';
import { ClusterNav, type ClusterNavEntry } from './ClusterNav.js';
import { ClusterSection } from './ClusterSection.js';
import { ArchiveSection } from './ArchiveSection.js';
import type { AreaTableKind } from './DataTable/columns.js';
import './dashboard.css';

const RESET_KEYS = [
  'q',
  'tipo',
  'procedura',
  'disponibilita',
  'tribunale',
  'min',
  'max',
  'blocco',
] as const satisfies ReadonlyArray<keyof AreaSearch>;

export function AreaView() {
  const { t } = useTranslation('dashboard');
  const { area } = useParams({ from: '/protected-layout/aste/$area' });
  const search = useSearch({ from: '/protected-layout/aste/$area' });
  const navigate = useNavigate({ from: '/aste/$area' });

  const { data: snapshot, isLoading, isError } = useAreaSnapshot(area as AreaSlug);
  const areaKind: AreaTableKind = area === 'immobili' ? 'real_estate' : 'credits';

  function patch(partial: Partial<AreaSearch>, opts?: { replace?: boolean }) {
    void navigate({
      search: (prev) => ({ ...prev, ...partial }),
      replace: opts?.replace,
    });
  }

  function resetFilters() {
    void navigate({
      search: (prev) => {
        const next = { ...prev };
        for (const key of RESET_KEYS) delete next[key];
        return next;
      },
    });
  }

  function goToLanding() {
    void navigate({ to: '/' });
  }

  const navEntries: ClusterNavEntry[] = useMemo(() => {
    if (!snapshot) return [];
    const clusterEntries = snapshot.clusters.map((c) => ({
      value: String(c.number),
      labelKey: `cluster.name.${c.key}`,
      number: c.number,
    }));
    return [...clusterEntries, { value: 'archivio', labelKey: 'archive.navLabel' }];
  }, [snapshot]);

  if (isLoading) {
    return <p className="area-status">{t('area.loading')}</p>;
  }
  if (isError || !snapshot) {
    return <p className="area-status area-status-error">{t('area.loadError')}</p>;
  }

  const resolvedCluster = resolveClusterSelector(search.cluster, snapshot.clusters.length);
  const tabsValue = resolvedCluster === 'archivio' ? 'archivio' : String(resolvedCluster);

  return (
    <div className="area-view">
      <AreaHeader area={area as AreaSlug} meta={snapshot.meta} onBack={goToLanding} />
      <TabsRoot
        value={tabsValue}
        onValueChange={(e: { value: string | number | undefined }) => {
          patch({ cluster: e.value === 'archivio' ? 'archivio' : Number(e.value) });
        }}
        lazy
      >
        <ClusterNav entries={navEntries} />
        <TabsPanels>
          {snapshot.clusters.map((cluster) => (
            <TabsPanel key={cluster.key} value={String(cluster.number)}>
              <ClusterSection
                cluster={cluster}
                areaKind={areaKind}
                bloccoIndex={snapshot.blocco_index}
                search={search}
                onPatch={patch}
                onReset={resetFilters}
              />
            </TabsPanel>
          ))}
          <TabsPanel value="archivio">
            <ArchiveSection
              rows={snapshot.archive}
              areaKind={areaKind}
              bloccoIndex={snapshot.blocco_index}
              search={search}
              onPatch={patch}
              onReset={resetFilters}
            />
          </TabsPanel>
        </TabsPanels>
      </TabsRoot>
    </div>
  );
}
