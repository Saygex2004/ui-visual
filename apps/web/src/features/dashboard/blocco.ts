// Blocco interactivity — pure helpers (UI §4.4). `blocco_index` (the
// snapshot) carries which clusters a block spans but not which bucket within
// a target cluster, so the bucket is found by searching that cluster's rows
// at click/jump time — there is no precomputed per-cluster bucket index.
import type { BloccoIndexEntry, ClusterBlock } from '@pvp/shared';
import type { BucketTab } from './urlState.js';

/** The other clusters (by key) a blocco continues in, besides the current one. */
export function otherClusters(
  entry: Pick<BloccoIndexEntry, 'clusters'>,
  currentKey: string,
): string[] {
  return entry.clusters.filter((key) => key !== currentKey);
}

/** Which bucket of `cluster` a blocco's rows sit in, or `null` when this
 *  cluster doesn't actually carry that block (a stale/hand-edited URL must
 *  never throw). */
export function findBucketForBlocco(cluster: ClusterBlock, bloccoKey: string): BucketTab | null {
  if (cluster.buckets.principali.some((row) => row.blocco_key === bloccoKey)) return 'principali';
  if (cluster.buckets.fallimenti.some((row) => row.blocco_key === bloccoKey)) return 'fallimenti';
  return null;
}
