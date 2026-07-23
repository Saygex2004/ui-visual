// Server bootstrap: validate config (fail-fast), build the app, listen.
import { loadConfig } from './config.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    // Refuse to start; name the offending variable(s).
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const app = await buildApp(config);
  try {
    await app.listen({ port: config.listenPort, host: '0.0.0.0' });
  } catch (err) {
    app.log.error({ err }, 'failed to start');
    process.exit(1);
  }
}

void main();
