// Area view (UI §2.3, redesigned in Execution Plan Phase 13): header, the
// selector toolbar (cluster combobox + geographic drill-down as progressive
// disclosure + OMI panel), and the active section (a cluster, or Archivio),
// one at a time — conditionally rendered off the same URL `cluster` param
// the old outer Tabs used (`resolveClusterSelector` semantics unchanged),
// so only the active section's table is ever mounted. Owns the single
// `useSearch`/`useNavigate` pair every child reads/writes through —
// `urlState.ts`'s schema is the single source of truth (FRONTEND.md §3).
//
// Also owns the same-session past-sale reorganization (UI §9.2/§9.3):
// `today` + `clearedIds` are local-only state, never persisted (§14 — the API
// has no operation to back either). `sessionMoves.clusters` (session-filtered
// buckets) is what each `ClusterSection` renders; `snapshot.clusters` (raw,
// unfiltered) is kept as the separate `clusters` prop for blocco jump-target
// resolution, since `blocco_index` itself is computed server-side over ALL
// active listings and knows nothing of this session's reorg. The former
// window.alert/confirm flows now go through the shared ConfirmDialog.
import { useState } from 'react';
import { Outlet, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { Field } from '../../components/Field.js';
import { REAL_ESTATE_CLUSTERS, type AreaSlug } from '@pvp/shared';
import { useAreaSnapshot } from './hooks.js';
import { resolveClusterSelector, type AreaSearch } from './urlState.js';
import { AreaHeader } from './AreaHeader.js';
import { ClusterSelect } from './ClusterSelect.js';
import { ClusterSection } from './ClusterSection.js';
import { ArchiveSection } from './ArchiveSection.js';
import { DrillDown } from './DrillDown.js';
import { OmiPanel } from './OmiPanel.js';
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

type AreaDialog =
  | { kind: 'refreshReport'; moved: number; total: number }
  | { kind: 'svuotaNothing' }
  | { kind: 'svuotaConfirm'; count: number; ids: readonly string[] };

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
  const [dialog, setDialog] = useState<AreaDialog | null>(null);

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
    setDialog({
      kind: 'refreshReport',
      moved: after.length - before.length,
      total: snapshot.archive.length + after.length,
    });
  }

  /** "Svuota archivio" (UI §9.3) — removes only this session's still-active-
   *  but-past rows from the archive view; permanently-withdrawn rows are
   *  never touched (they aren't in `eligible` to begin with). No server call. */
  function handleSvuota() {
    if (!snapshot) return;
    const eligible = eligibleMoved(computeSessionMoves(snapshot.clusters, today).moved, clearedIds);
    if (eligible.length === 0) {
      setDialog({ kind: 'svuotaNothing' });
      return;
    }
    setDialog({
      kind: 'svuotaConfirm',
      count: eligible.length,
      ids: eligible.map((r) => r.id),
    });
  }

  if (isLoading) {
    return <StatusDisplay variant="loading" message={t('area.loading')} />;
  }
  if (isError || !snapshot) {
    return <StatusDisplay variant="error" message={t('area.loadError')} />;
  }

  const resolvedCluster = resolveClusterSelector(search.cluster, snapshot.clusters.length);

  const sessionMoves = computeSessionMoves(snapshot.clusters, today);
  const eligible = eligibleMoved(sessionMoves.moved, clearedIds);
  const archiveRows = [...snapshot.archive, ...eligible];

  const activeCluster =
    resolvedCluster === 'archivio'
      ? null
      : (sessionMoves.clusters.find((c) => c.number === resolvedCluster) ?? null);

  const hasGeography =
    areaKind === 'real_estate' &&
    activeCluster != null &&
    (REAL_ESTATE_CLUSTERS.find((c) => c.key === activeCluster.key)?.regions.length ?? 0) > 0;

  const activeClusterRows = activeCluster
    ? [...activeCluster.buckets.principali, ...activeCluster.buckets.fallimenti]
    : [];

  return (
    <div className="area-view">
      <AreaHeader
        area={area as AreaSlug}
        meta={snapshot.meta}
        onBack={goToLanding}
        onRefreshToday={handleRefreshToday}
      />

      <div className="selector-toolbar">
        <Field label={t('selector.clusterLabel')} className="selector-field-cluster">
          <ClusterSelect
            clusters={sessionMoves.clusters}
            value={resolvedCluster}
            archiveCount={archiveRows.length}
            onChange={(value) => patch({ cluster: value })}
          />
        </Field>
        {hasGeography ? (
          <DrillDown rows={activeClusterRows} search={search} onPatch={patch} />
        ) : null}
      </div>

      {hasGeography ? (
        <OmiPanel rows={activeClusterRows} omiByComune={snapshot.omi_by_comune} search={search} />
      ) : null}

      {activeCluster ? (
        <ClusterSection
          key={activeCluster.key}
          cluster={activeCluster}
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
        />
      ) : (
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
      )}

      <ConfirmDialog
        open={dialog != null}
        title={
          dialog?.kind === 'svuotaConfirm'
            ? t('archive.svuotaTitle')
            : dialog?.kind === 'svuotaNothing'
              ? t('archive.svuotaNothingTitle')
              : t('archive.refreshReportTitle')
        }
        description={
          dialog?.kind === 'svuotaConfirm'
            ? t('archive.svuotaConfirm', { count: dialog.count })
            : dialog?.kind === 'svuotaNothing'
              ? t('archive.svuotaNothing')
              : dialog?.kind === 'refreshReport'
                ? t('archive.refreshReport', { moved: dialog.moved, total: dialog.total })
                : undefined
        }
        confirmLabel={
          dialog?.kind === 'svuotaConfirm' ? t('common:actions.confirm') : t('common:actions.ok')
        }
        cancelLabel={dialog?.kind === 'svuotaConfirm' ? t('common:actions.cancel') : undefined}
        destructive={dialog?.kind === 'svuotaConfirm'}
        onConfirm={() => {
          if (dialog?.kind === 'svuotaConfirm') {
            const ids = dialog.ids;
            setClearedIds((prev) => new Set([...prev, ...ids]));
          }
        }}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      />

      {/* The listing workspace (UI §4.5) — renders only when the URL is
          /aste/:area/lotto/:id; a Drawer portal, so its position here is not
          visually significant, but without an Outlet at all it never mounts. */}
      <Outlet />
    </div>
  );
}
