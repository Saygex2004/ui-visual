// One-off dev/perf tool (Phase 4 task 8, UI §11): loads a large deterministic
// synthetic real-estate listing set into a RUNNING emulator's `listings`
// collection, so the dashboard can be exercised at the scale it must stay
// responsive at. Distinct from `pnpm seed` (the small, hand-curated fixture
// set used for dev/e2e correctness) — this is for manual, real-browser
// performance measurement only; never run without FIRESTORE_EMULATOR_HOST.
import { Timestamp } from 'firebase-admin/firestore';
import { buildSyntheticListings } from '@pvp/shared/testing';
import { connectDb } from './lib.js';

const PROJECT_ID = 'demo-pvp-dashboard';
const COUNT = Number(process.env.SYNTHETIC_COUNT ?? 10_000);
const SEED = process.env.SYNTHETIC_SEED ?? 'perf-check-seed';

function toTs(iso: string | null): Timestamp | null {
  return iso == null ? null : Timestamp.fromDate(new Date(iso));
}

async function main(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Refusing to run without FIRESTORE_EMULATOR_HOST set — this never touches production.',
    );
  }

  const db = connectDb(PROJECT_ID);

  console.log('[seed-synthetic] wiping existing listings…');
  await db.recursiveDelete(db.collection('listings'));

  console.log(`[seed-synthetic] generating ${COUNT} synthetic listings (seed="${SEED}")…`);
  const listings = buildSyntheticListings(COUNT, SEED);

  console.log('[seed-synthetic] writing…');
  const bw = db.bulkWriter();
  for (const listing of listings) {
    bw.set(db.collection('listings').doc(String(listing.id)), {
      ...listing,
      first_seen_at: toTs(listing.first_seen_at),
      last_seen_at: toTs(listing.last_seen_at),
      archived_at: toTs(listing.archived_at),
    });
  }
  await bw.close();

  // Bump meta so a running server's cache poll picks this up (or restart the
  // server to pick it up at boot via cache.init()).
  const active = listings.filter((l) => l.archived_at === null).length;
  await db.collection('meta').doc('immobili').set({
    last_success_at: Timestamp.now(),
    total_active: active,
    total_stored: listings.length,
    detail_errors: 0,
  });

  console.log(`[seed-synthetic] done: ${listings.length} listings (${active} active).`);
}

void main();
