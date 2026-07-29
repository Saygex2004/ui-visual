// Shared Firebase Storage client (Firebase Admin SDK) — attachments live here
// (DATA_MODEL.md §14), never reachable directly by the browser
// (SPECIFICATIONS.md §11). When FIREBASE_STORAGE_EMULATOR_HOST is set the
// Admin SDK routes to the emulator automatically, mirroring firestore.ts.
// Reuses firestore.ts's App singleton — initializeApp() throws if called
// twice for the same default app.
import { getStorage, type Storage } from 'firebase-admin/storage';
import { ensureApp } from './firestore.js';

// `@google-cloud/storage`'s `Bucket` is a transitive dependency of
// `firebase-admin`, not a direct one of this package — derive the type from
// `Storage['bucket']`'s own return type instead of importing it directly.
export type Bucket = ReturnType<Storage['bucket']>;

let cachedBucket: Bucket | undefined;

/** The Storage bucket singleton. `bucketName` undefined ⇒
 *  `{projectId}.appspot.com` (`PVPDASH_STORAGE_BUCKET` unset —
 *  CONFIGURATION.md §2). Always passed explicitly to `.bucket(name)` rather
 *  than relying on `.bucket()`'s own app-level default resolution — verified
 *  against the real emulator that whichever code path calls
 *  `initializeApp()` *first* wins the process-global default app (this
 *  package's `firestore.ts`, `@pvp/seed`'s own `connectDb`, or here), and an
 *  app initialized without an explicit `storageBucket` config leaves
 *  `.bucket()` (no arg) unable to resolve any default at all ("Bucket name
 *  not specified or invalid") — depending on init order across two different
 *  packages is fragile, so this resolves the name itself regardless. */
export function getBucket(projectId: string, bucketName?: string): Bucket {
  if (cachedBucket) return cachedBucket;
  const app = ensureApp(projectId);
  cachedBucket = getStorage(app).bucket(bucketName ?? `${projectId}.appspot.com`);
  return cachedBucket;
}
