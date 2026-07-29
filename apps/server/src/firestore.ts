// Shared Firestore client (Firebase Admin SDK) — the ONLY database client in
// the system (SPECIFICATIONS.md §2). When FIRESTORE_EMULATOR_HOST is set the
// Admin SDK routes to the emulator automatically; its ABSENCE is what
// "production access" means (CONFIGURATION.md §3). Phase 2 runs against the
// emulator only — no production credentials here.
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { emulatorSigningCredential } from '@pvp/seed';

let cachedApp: App | undefined;
let cachedDb: Firestore | undefined;

/** Lazily initialize (once) and return the Admin app. Exported so
 *  `storage.ts` shares the exact same App instance rather than
 *  double-initializing (`initializeApp` throws if called twice for the same
 *  default app). Two things verified against the real emulator, not assumed:
 *  - `storageBucket` must be set here — a bare `{projectId}` init leaves
 *    `getStorage(app).bucket()` unable to resolve any default at all
 *    ("Bucket name not specified or invalid"). `PVPDASH_STORAGE_BUCKET`
 *    (when set) still overrides it via `storage.ts`'s own `bucketName` param.
 *  - `getSignedUrl()` (attachments downloads) always tries to sign with real
 *    credentials, regardless of `FIRESTORE_EMULATOR_HOST`/
 *    `FIREBASE_STORAGE_EMULATOR_HOST` — `@google-cloud/storage`'s signer has
 *    no emulator branch at all — so without ANY private key it throws
 *    "Could not load the default credentials" even though every other
 *    Storage operation works fine emulated. `@pvp/seed`'s
 *    `emulatorSigningCredential` supplies a throwaway one, only when
 *    `FIRESTORE_EMULATOR_HOST` is set (never in production — real
 *    Application Default Credentials apply there, untouched). Lives in
 *    `@pvp/seed` (already a dependency here, dev/test-only, same as
 *    `seedContent`) rather than duplicated, since `@pvp/seed`'s own
 *    `connectDb` — the OTHER path that can initialize this same shared
 *    Admin app first, in the integration-test flow — needs the identical fix. */
export function ensureApp(projectId: string): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0]!;
    return cachedApp;
  }
  const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  cachedApp = initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    ...(emulated ? { credential: cert(emulatorSigningCredential(projectId)) } : {}),
  });
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
