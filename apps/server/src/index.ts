// Server bootstrap: validate config (fail-fast), connect Firestore, build the
// app (primes the snapshot cache, runs first-run admin bootstrap), listen.
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { getDb } from './firestore.js';
import { seedContent } from '@pvp/seed';

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    // Refuse to start; name the offending variable(s).
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const db = getDb(config.PVPDASH_FIRESTORE_PROJECT_ID);

  if (config.PVPDASH_RESET_ACCOUNTS_ON_BOOT) {
    // e2e-only escape hatch (playwright.config.ts). Must run here, ahead of
    // buildApp's bootstrap call, rather than in Playwright's globalSetup:
    // globalSetup runs AFTER webServer processes are already started and
    // healthy, so a wipe there deletes the admin bootstrap just created
    // instead of preceding it.
    await Promise.all(
      ['users', 'usernames', 'sessions'].map((name) => db.recursiveDelete(db.collection(name))),
    );
  }

  if (config.PVPDASH_SEED) {
    // e2e/dev-only (CONFIGURATION.md §3) — content fixtures only, never
    // accounts; see seedContent's own doc comment for why the split matters.
    await seedContent(db);
  }

  let app;
  try {
    ({ app } = await buildApp(config, db));
  } catch (err) {
    // Covers both the admin-bootstrap refusal (empty `users`, no bootstrap
    // password) and any other startup failure — fail closed and loud.
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  try {
    await app.listen({ port: config.listenPort, host: '0.0.0.0' });
  } catch (err) {
    app.log.error({ err }, 'failed to start');
    process.exit(1);
  }
}

void main();
