// Same-session past-sale handling (UI §9.2/§9.3, DOMAIN_RULES.md §11). Purely
// client-side reorganization of already-fetched data — SPECIFICATIONS.md §14:
// the API exposes no operation that deletes, hides, or edits a listing, so
// nothing here ever calls the server. `clearedIds` (Svuota archivio, owned by
// the caller) only hides rows from the archive view; it never puts them back
// in a live cluster table — a past-sale row stays past-sale for the session.
import { isPastSale, type ArchiveRow, type ClusterBlock, type ListingRow } from '@pvp/shared';

/** Today in the VIEWER's local calendar, `YYYY-MM-DD` — never `toISOString()`,
 *  which reads UTC and can shift the day near midnight in positive-UTC-offset
 *  zones (same care as DataTable/formatting.ts's `formatDate`). */
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface SessionMoveResult {
  /** `clusters`, with every bucket filtered down to rows that have not moved
   *  this session — feeds ClusterSection instead of the raw snapshot clusters. */
  clusters: ClusterBlock[];
  /** Every row moved this session, tagged with `cluster_key` like a real
   *  `ArchiveRow` (Svuota's `clearedIds` filtering happens separately, at the
   *  call site, so this always reflects the full moved set for a given day). */
  moved: ArchiveRow[];
}

/** Partitions every cluster's rows by `isPastSale(data_vendita, todayIso)`. */
export function computeSessionMoves(
  clusters: readonly ClusterBlock[],
  today: string,
): SessionMoveResult {
  const moved: ArchiveRow[] = [];

  function stillActive(rows: readonly ListingRow[], clusterKey: string): ListingRow[] {
    return rows.filter((row) => {
      if (isPastSale(row.data_vendita, today)) {
        moved.push({ ...row, cluster_key: clusterKey });
        return false;
      }
      return true;
    });
  }

  const nextClusters = clusters.map((cluster) => ({
    ...cluster,
    buckets: {
      principali: stillActive(cluster.buckets.principali, cluster.key),
      fallimenti: stillActive(cluster.buckets.fallimenti, cluster.key),
    },
  }));

  return { clusters: nextClusters, moved };
}

/** The session-moved rows still eligible for display (not cleared via
 *  Svuota archivio) — the set both the archive table and the Aggiorna/Svuota
 *  controls' counts are computed from. */
export function eligibleMoved(
  moved: readonly ArchiveRow[],
  clearedIds: ReadonlySet<string>,
): ArchiveRow[] {
  return moved.filter((row) => !clearedIds.has(row.id));
}
