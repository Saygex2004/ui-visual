// Seed library — loads the canonical fixture dataset (seed/fixtures/) into a
// Firestore instance. Exported so both the CLI (seed.ts) and the server's
// integration suite can seed identical state (TESTING.md §1: "Fixtures are the
// shared vocabulary"). Every function here is emulator-agnostic; the caller is
// responsible for only ever connecting this to an emulator (see seed.ts's
// FIRESTORE_EMULATOR_HOST guard).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

// A throwaway RSA key, unrelated to any real GCP project or account — its
// only job is letting `@google-cloud/storage`'s `getSignedUrl()` complete its
// LOCAL signing math against the Storage emulator. Verified against the real
// emulator: the signer has no emulator-aware branch at all, so it always
// tries to load real Application Default Credentials regardless of
// `FIRESTORE_EMULATOR_HOST`/`FIREBASE_STORAGE_EMULATOR_HOST` — every other
// Storage operation (upload/download/delete/exists) works fine emulated
// without this, only signing needs it. The emulator never cryptographically
// verifies the resulting signature.
const EMULATOR_FAKE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyKJjO0Lfi0isS
NCk5kTgkvvYdO2hCbyQAyWNxfy7sjyX0s8bENWHjYbQ/O/er31JzxUNg1nRSuHc+
Vb77UkY9ELAdG527DNmtTp8dsuwFNsafXy3Z0fgF1A1kAkT7o3z2aqDs2htM0sdN
u2cbHs27HhmYOvZarvyT0SY/TdAU628GFRCjtNcm2wAY5995ZI3JmP5TqmlJi8/q
NwaiTCzLlOb0wFnNXQa1ShSfFuqdkn7LwY9VhiiSkUZ52o20OffnW5FTbqLbMpv4
utf6Z1dSbn+zW9KvQtULebdfCv/J8IFQW0uuxCr0Z+HqwMU+DGAtJlbeQpcQBp+j
NBGOl0ybAgMBAAECggEAJZiXlp1JEN6VJERJptJUbLy3pzeQKuTVTi0xhRP3zQfw
VJFTkrhJLfjCVs3K2ERKXA/2xgq7hXFUCJ2DrfmQxPYulBXt1TlC/mWnAldtozQJ
+jvVqy+6DVDQephYAlpf1oht6U2lkTKxyF+RxJFdjO0vLYbT0hM3TeJHFfjPvnoN
m9+mW3nQnw3VyTO2FuqtbarjcbYBK0HuA/9JrvQa0UNAsS+1MEvb/rqpdFwnabeM
mWBKh5IHoEhzB4XqZmW8SaRuFYP4fAGN8B1VhEsL9AJf+CgCOJSYEFnE5fdS/Fgy
CmGQMMKf9F9S3y8cAHsgkY2p1Ni6mluzRQ8ybppL4QKBgQDyOpdu2irKLIHHJKbX
Y43iJIWNFxdsIPZ3xAsLCel2a5eTEG5J6qTrTRnEWcZ+DfmbHVaBaOyP8yjcaGB6
3OuSPQMG9S+fuYvJeKmbOOANUKN7GPA13wivKr2De4W0C8PsWLAHztiS/GFCd3/V
kEzzFPMTMkA7mICCUMgzL87UIwKBgQC8SYYbApXbzEk2wCzB2EumfhZFudOJhMhC
+Xafe4zYtIHTmyjjRnil0UdywWDwiwadGit0QLOGlnKIpenXYSt5QtJrKRVAqSXO
I05nHWdyTaSXMkfhXYVmUFtCOIRHV+/4sPdeooZBBnC9KyyW++pG6c8F391+nd87
HBpbnasRKQKBgCo9FVL7MCL5B9hWB9HfRkp829zyfd8ZEGFqChLus4s2z8ORReoV
xJRTaX7XuMkaXsAxqXf/d+DSIfntKYXDKEDj6rc34goULNAA/nJWxJsNyLQacSiz
r6v74/gdff8bXhrEjE2QQCvBXqRceiofc4ufx5M9W/4IZcBTndVvLL3JAoGBALlZ
24VNVz7HbK9UIPs2NMqSRtSe6Mnwh7++mfLHilBt6Xvouyh44B3D1gT2rro88ebH
s00+wDvWcKtqQLeAdW5qxH8vMzezC39QrEa/4GzaWBNrMO1+xeqBYkTfJACjZZ04
gFuNvIHYmDTwgnWjSe5DDkQnK4EQYodq09uqa5N5AoGADVVg1gcM7YzyRBfJEWww
pm19NQAFumgi1xdC0OuXUB3ShCgmAmEn7yXZ3/TZW3C4Z9l19Ek4JBQ6S3nl8eY0
S3x81aJyzNkelrODibasVBlMNA7BcYN3VslgX1+3hwAA3bFiHAJ0WhJx36Qt8LdM
yHPRA5/T8O30dbZF0BqbCTQ=
-----END PRIVATE KEY-----
`;

/** Exported so `apps/server`'s own `firestore.ts` can apply the identical
 *  fix on whichever code path happens to initialize the process's one
 *  shared Firebase Admin app first (this package's own `connectDb`, in the
 *  integration-test flow, or `apps/server`'s `ensureApp`, in the real
 *  dev/e2e server-boot flow). */
export function emulatorSigningCredential(projectId: string): ServiceAccount {
  return {
    projectId,
    clientEmail: `emulator-fake@${projectId}.iam.gserviceaccount.com`,
    privateKey: EMULATOR_FAKE_PRIVATE_KEY,
  };
}

export const TOP_LEVEL_COLLECTIONS = [
  'listings',
  'omi_prices',
  'meta',
  'runs',
  'settings',
  'users',
  'usernames',
  'sessions',
  'ratings',
  'calendar_days',
  'assignment_index',
  'listing_activity',
  'chat_threads',
  'attachments',
  'user_counters',
  'admin_events',
] as const;

export function connectDb(projectId: string): Firestore {
  const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const app =
    getApps()[0] ??
    initializeApp({
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      ...(emulated ? { credential: cert(emulatorSigningCredential(projectId)) } : {}),
    });
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, filename), 'utf8')) as T;
}

function toTs(iso: string | null | undefined): Timestamp | null {
  return iso == null ? null : Timestamp.fromDate(new Date(iso));
}

/** Fixtures carry a helper `id` field used to key the document; strip it before
 *  writing (Firestore already keys the doc via `.doc(id)`). */
function withoutId<T extends { id?: unknown }>(row: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = row;
  return rest;
}

/** Wipe every seeded collection (and subcollections) — the wipe half of
 *  wipe-and-load idempotency. */
export async function wipeAll(db: Firestore): Promise<void> {
  await Promise.all(TOP_LEVEL_COLLECTIONS.map((name) => db.recursiveDelete(db.collection(name))));
}

// ---- per-collection loaders -------------------------------------------

async function seedListings(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('listings.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('listings').doc(String(row.id)), {
      ...row,
      first_seen_at: toTs(row.first_seen_at as string),
      last_seen_at: toTs(row.last_seen_at as string),
      archived_at: toTs(row.archived_at as string | null),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedOmiPrices(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('omi_prices.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('omi_prices').doc(String(row.id)), {
      ...withoutId(row),
      fetched_at: toTs(row.fetched_at as string),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedMeta(db: Firestore): Promise<number> {
  const meta = loadJson<Record<string, Record<string, unknown>>>('meta.json');
  const bw = db.bulkWriter();
  bw.set(db.collection('meta').doc('immobili'), {
    ...meta.immobili,
    last_success_at: toTs(meta.immobili?.last_success_at as string),
  });
  bw.set(db.collection('meta').doc('corporate'), {
    ...meta.corporate,
    last_success_at: toTs(meta.corporate?.last_success_at as string),
  });
  bw.set(db.collection('meta').doc('omi'), {
    ...meta.omi,
    fetched_at: toTs(meta.omi?.fetched_at as string),
  });
  await bw.close();
  return 3;
}

async function seedRuns(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('runs.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('runs').doc(String(row.id)), {
      ...withoutId(row),
      started_at: toTs(row.started_at as string),
      finished_at: toTs(row.finished_at as string),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedSettings(db: Firestore): Promise<number> {
  const settings = loadJson<{ extraction_categories: Record<string, unknown> }>('settings.json');
  const doc = settings.extraction_categories;
  await db
    .collection('settings')
    .doc('extraction_categories')
    .set({ ...doc, updated_at: toTs(doc.updated_at as string) });
  return 1;
}

async function seedUsers(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('users.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('users').doc(String(row.id)), {
      ...withoutId(row),
      created_at: toTs(row.created_at as string),
      updated_at: toTs(row.updated_at as string),
    });
    // The usernames/{lowercased} uniqueness claim is derivable from each
    // user's username — seeded here rather than as a separate fixture file,
    // so the two can never drift apart (DATA_MODEL.md §9).
    const username = String(row.username);
    bw.set(db.collection('usernames').doc(username.toLowerCase()), {
      user_id: String(row.id),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedRatings(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('ratings.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('ratings').doc(String(row.id)), {
      ...withoutId(row),
      set_at: toTs(row.set_at as string),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedCalendarDays(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('calendar_days.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('calendar_days').doc(String(row.id)), {
      ...withoutId(row),
      created_at: toTs(row.created_at as string),
      updated_at: toTs(row.updated_at as string),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedAssignmentIndex(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('assignment_index.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('assignment_index').doc(String(row.id)), {
      ...withoutId(row),
      assigned_at: toTs(row.assigned_at as string),
      completed_at: toTs(row.completed_at as string | null),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedListingActivity(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('listing_activity.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('listing_activity').doc(String(row.id)), {
      ...withoutId(row),
      at: toTs(row.at as string),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedChatThreads(
  db: Firestore,
): Promise<{ threads: number; messages: number; reads: number }> {
  type Fixture = Record<string, unknown> & {
    id: string;
    messages?: Array<Record<string, unknown>>;
    reads?: Array<Record<string, unknown>>;
  };
  const rows = loadJson<Fixture[]>('chat_threads.json');
  const bw = db.bulkWriter();
  let messages = 0;
  let reads = 0;

  for (const row of rows) {
    const { messages: msgs, reads: threadReads, ...thread } = row;
    const threadRef = db.collection('chat_threads').doc(String(row.id));
    bw.set(threadRef, {
      ...withoutId(thread),
      created_at: toTs(thread.created_at as string),
      closed_at: toTs(thread.closed_at as string | null),
      last_message_at: toTs(thread.last_message_at as string | null),
    });

    for (const msg of msgs ?? []) {
      bw.set(threadRef.collection('messages').doc(String(msg.id)), {
        ...withoutId(msg),
        sent_at: toTs(msg.sent_at as string),
      });
      messages += 1;
    }
    for (const read of threadReads ?? []) {
      bw.set(threadRef.collection('reads').doc(String(read.id)), {
        last_read_at: toTs(read.last_read_at as string),
      });
      reads += 1;
    }
  }

  await bw.close();
  return { threads: rows.length, messages, reads };
}

async function seedAttachments(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('attachments.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('attachments').doc(String(row.id)), {
      ...withoutId(row),
      uploaded_at: toTs(row.uploaded_at as string),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedUserCounters(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('user_counters.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('user_counters').doc(String(row.id)), {
      ...withoutId(row),
      updated_at: toTs(row.updated_at as string),
    });
  }
  await bw.close();
  return rows.length;
}

async function seedAdminEvents(db: Firestore): Promise<number> {
  const rows = loadJson<Array<Record<string, unknown>>>('admin_events.json');
  const bw = db.bulkWriter();
  for (const row of rows) {
    bw.set(db.collection('admin_events').doc(String(row.id)), {
      ...withoutId(row),
      at: toTs(row.at as string),
    });
  }
  await bw.close();
  return rows.length;
}

/** Load only the listing-browsing content (listings, OMI, meta, runs,
 *  settings) — deliberately excludes users/sessions and every other Part B
 *  collection, so it composes safely with the server's own account
 *  reset/bootstrap boot step (PVPDASH_RESET_ACCOUNTS_ON_BOOT) regardless of
 *  which runs first. Used by `PVPDASH_SEED=1` (CONFIGURATION.md §3) and the
 *  e2e browse flow. Does NOT wipe first. */
export async function seedContent(db: Firestore): Promise<Record<string, number>> {
  return {
    listings: await seedListings(db),
    omi_prices: await seedOmiPrices(db),
    meta: await seedMeta(db),
    runs: await seedRuns(db),
    settings: await seedSettings(db),
  };
}

/** Load every fixture collection into `db`. Does NOT wipe first — call
 *  `wipeAll(db)` beforehand for wipe-and-load idempotency. Returns per-
 *  collection counts. */
export async function seedAll(db: Firestore): Promise<Record<string, number>> {
  const chat = await seedChatThreads(db);
  return {
    listings: await seedListings(db),
    omi_prices: await seedOmiPrices(db),
    meta: await seedMeta(db),
    runs: await seedRuns(db),
    settings: await seedSettings(db),
    users: await seedUsers(db),
    ratings: await seedRatings(db),
    calendar_days: await seedCalendarDays(db),
    assignment_index: await seedAssignmentIndex(db),
    listing_activity: await seedListingActivity(db),
    chat_threads: chat.threads,
    'chat_threads/messages': chat.messages,
    'chat_threads/reads': chat.reads,
    attachments: await seedAttachments(db),
    user_counters: await seedUserCounters(db),
    admin_events: await seedAdminEvents(db),
  };
}
