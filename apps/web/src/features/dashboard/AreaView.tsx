// Area view (UI §2.3): back control + header + cluster nav + the active
// section (a cluster, or Archivio), one at a time. Owns the outer
// `TabsRoot` (Radix's `Tabs.Content` only renders its children for the
// active tab — see components/Tabs.tsx — so only the active section's
// table(s) are ever mounted) and the
// single `useSearch`/`useNavigate` pair every child reads/writes through —
// `urlState.ts`'s schema is the single source of truth (FRONTEND.md §3).
// Cluster nav entries come from `snapshot.clusters` itself (always one entry
// per cluster definition, even empty ones — apps/server/src/cache/build.ts
// pre-seeds every cluster before placing listings) rather than a second,
// separately-imported constant, so nav and panels can never diverge.
//
// Also owns the same-session past-sale reorganization (UI §9.2/§9.3):
// `today` + `clearedIds` are local-only state, never persisted (§14 — the API
// has no operation to back either). `sessionMoves.clusters` (session-filtered
// buckets) is what each `ClusterSection` renders; `snapshot.clusters` (raw,
// unfiltered) is kept as the separate `clusters` prop for blocco jump-target
// resolution, since `blocco_index` itself is computed server-side over ALL
// active listings and knows nothing of this session's reorg.
import { useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { TabsRoot, TabsPanel } from '../../components/Tabs.js';
import type { AreaSlug } from '@pvp/shared';
import { useAreaSnapshot } from './hooks.js';
import { resolveClusterSelector, type AreaSearch } from './urlState.js';
import { AreaHeader } from './AreaHeader.js';
import { ClusterNav, type ClusterNavEntry } from './ClusterNav.js';
import { ClusterSection } from './ClusterSection.js';
import { ArchiveSection } from './ArchiveSection.js';
import { findBucketForBlocco } from './blocco.js';
import { computeSessionMoves, eligibleMoved, todayIso } from './sessionArchive.js';
import { useRatingsMap } from '../ratings/hooks.js';
import { useMyThreadsMap } from '../chat/hooks.js';
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
  const ratings = useRatingsMap();
  const chatsByListing = useMyThreadsMap();

  const [today, setToday] = useState(todayIso);
  const [clearedIds, setClearedIds] = useState<ReadonlySet<string>>(new Set());

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

  /** Toggle isolation of one block within its own cluster/table (UI §4.4);
   *  clicking the already-active badge clears it. */
  function handleIsolate(bloccoKey: string) {
    patch({ blocco: search.blocco === bloccoKey ? undefined : bloccoKey });
  }

  /** Cross-cluster jump: switch to the target cluster + its Principali/
   *  Fallimenti tab, isolate the block there. `snapshot` is always defined by
   *  the time a child can call this (the loading/error guard below). */
  function handleJump(targetClusterKey: string, bloccoKey: string) {
    const target = snapshot?.clusters.find((c) => c.key === targetClusterKey);
    if (!target) return;
    const bucket = findBucketForBlocco(target, bloccoKey) ?? 'principali';
    patch({ cluster: target.number, tab: bucket, blocco: bloccoKey });
  }

  /** "Aggiorna alla data odierna" (UI §9.2) — re-evaluates today's date
   *  against the already-loaded snapshot and reports the delta this click
   *  caused, plus the resulting archive total. Client-side only; no request. */
  function handleRefreshToday() {
    if (!snapshot) return;
    const before = eligibleMoved(computeSessionMoves(snapshot.clusters, today).moved, clearedIds);
    const newToday = todayIso();
    const after = eligibleMoved(computeSessionMoves(snapshot.clusters, newToday).moved, clearedIds);
    setToday(newToday);
    window.alert(
      t('archive.refreshReport', {
        moved: after.length - before.length,
        total: snapshot.archive.length + after.length,
      }),
    );
  }

  /** "Svuota archivio" (UI §9.3) — removes only this session's still-active-
   *  but-past rows from the archive view; permanently-withdrawn rows are
   *  never touched (they aren't in `eligible` to begin with). No server call. */
  function handleSvuota() {
    if (!snapshot) return;
    const eligible = eligibleMoved(computeSessionMoves(snapshot.clusters, today).moved, clearedIds);
    if (eligible.length === 0) {
      window.alert(t('archive.svuotaNothing'));
      return;
    }
    if (!window.confirm(t('archive.svuotaConfirm', { count: eligible.length }))) return;
    setClearedIds((prev) => new Set([...prev, ...eligible.map((r) => r.id)]));
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

  const sessionMoves = computeSessionMoves(snapshot.clusters, today);
  const eligible = eligibleMoved(sessionMoves.moved, clearedIds);
  const archiveRows = [...snapshot.archive, ...eligible];

  return (
    <div className="area-view">
      <AreaHeader
        area={area as AreaSlug}
        meta={snapshot.meta}
        onBack={goToLanding}
        onRefreshToday={handleRefreshToday}
      />
      <TabsRoot
        value={tabsValue}
        onValueChange={(value) => {
          patch({ cluster: value === 'archivio' ? 'archivio' : Number(value) });
        }}
      >
        <ClusterNav entries={navEntries} />
        {sessionMoves.clusters.map((cluster) => (
          <TabsPanel key={cluster.key} value={String(cluster.number)}>
            <ClusterSection
              cluster={cluster}
              clusters={snapshot.clusters}
              areaKind={areaKind}
              area={area as AreaSlug}
              ratings={ratings}
              chatsByListing={chatsByListing}
              bloccoIndex={snapshot.blocco_index}
              omiByComune={snapshot.omi_by_comune}
              search={search}
              onPatch={patch}
              onReset={resetFilters}
              onIsolate={handleIsolate}
              onJump={handleJump}
            />
          </TabsPanel>
        ))}
        <TabsPanel value="archivio">
          <ArchiveSection
            rows={archiveRows}
            clusters={snapshot.clusters}
            areaKind={areaKind}
            area={area as AreaSlug}
            ratings={ratings}
            chatsByListing={chatsByListing}
            bloccoIndex={snapshot.blocco_index}
            search={search}
            onPatch={patch}
            onReset={resetFilters}
            onIsolate={handleIsolate}
            onJump={handleJump}
            onSvuota={handleSvuota}
          />
        </TabsPanel>
      </TabsRoot>
      {/* The listing workspace (UI §4.5) — renders only when the URL is
          /aste/:area/lotto/:id; a Drawer portal, so its position here is not
          visually significant, but without an Outlet at all it never mounts. */}
      <Outlet />
    </div>
  );
}
