// Integration-test support: connect to the emulator and reseed the canonical
// fixture dataset (@pvp/seed — the same code path `pnpm seed` uses, so tests
// and dev seeding can never drift apart). Test-only; never imported by
// runtime code.
import { connectDb, wipeAll, seedAll } from '@pvp/seed';
import type { Firestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.PVPDASH_FIRESTORE_PROJECT_ID ?? 'demo-pvp-dashboard';

let db: Firestore | undefined;

/** The shared emulator Firestore client for this test process. */
export function testDb(): Firestore {
  db ??= connectDb(PROJECT_ID);
  return db;
}

/** Wipe and reload the canonical fixture set. Call from `beforeAll`. */
export async function reseed(): Promise<Record<string, number>> {
  const d = testDb();
  await wipeAll(d);
  return seedAll(d);
}
