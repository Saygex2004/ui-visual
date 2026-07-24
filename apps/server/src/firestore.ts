// Shared Firestore client (Firebase Admin SDK) — the ONLY database client in
// the system (SPECIFICATIONS.md §2). When FIRESTORE_EMULATOR_HOST is set the
// Admin SDK routes to the emulator automatically; its ABSENCE is what
// "production access" means (CONFIGURATION.md §3). Phase 2 runs against the
// emulator only — no production credentials here.
import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedApp: App | undefined;
let cachedDb: Firestore | undefined;

/** Lazily initialize (once) and return the Admin app. */
function ensureApp(projectId: string): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  cachedApp = existing.length > 0 ? existing[0]! : initializeApp({ projectId });
  return cachedApp;
}

/**
 * The Firestore singleton. Reused by the server (via the plugin below) and by
 * the seed script. `ignoreUndefinedProperties` keeps writes clean; settings are
 * applied once, before first use.
 */
export function getDb(projectId: string): Firestore {
  if (cachedDb) return cachedDb;
  const app = ensureApp(projectId);
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  cachedDb = db;
  return cachedDb;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Firestore;
  }
}
