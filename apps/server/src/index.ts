// Server bootstrap: validate config (fail-fast), connect Firestore, build the
// app (primes the snapshot cache), listen.
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { getDb } from './firestore.js';

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
  const { app } = await buildApp(config, db);
  try {
    await app.listen({ port: config.listenPort, host: '0.0.0.0' });
  } catch (err) {
    app.log.error({ err }, 'failed to start');
    process.exit(1);
  }
}

void main();
