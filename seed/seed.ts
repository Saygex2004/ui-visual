// Emulator seed CLI (Phase 2 task 1, REPOSITORY_STRUCTURE.md). Wipes and
// reloads the canonical fixture dataset into the Firestore emulator. NEVER
// touches production — refuses to run unless FIRESTORE_EMULATOR_HOST is set
// (CONFIGURATION.md §3, TESTING.md §1). Root script: `pnpm seed`.
import { connectDb, wipeAll, seedAll } from './lib.js';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    '[seed] Refusing to run: FIRESTORE_EMULATOR_HOST is not set.\n' +
      '[seed] This script must never write to production Firestore.\n' +
      '[seed] Start the emulators first: pnpm emulators',
  );
  process.exit(1);
}

const PROJECT_ID = process.env.PVPDASH_FIRESTORE_PROJECT_ID ?? 'demo-pvp-dashboard';

async function main(): Promise<void> {
  const db = connectDb(PROJECT_ID);

  console.log(`[seed] target: ${process.env.FIRESTORE_EMULATOR_HOST} (project ${PROJECT_ID})`);
  console.log('[seed] wiping existing collections…');
  await wipeAll(db);

  console.log('[seed] loading fixtures…');
  const counts = await seedAll(db);

  console.log('[seed] done:');
  for (const [name, n] of Object.entries(counts)) {
    console.log(`  ${name}: ${n}`);
  }
}

void main().catch((err: unknown) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
