// Application factory: builds a configured Fastify instance without listening,
// so tests can inject requests against it. When `db` is supplied, the data
// layer (snapshot cache + listings routes) is wired in and readiness becomes
// cache-driven; without it (pure offline unit tests) the app stays a health-
// and-error-envelope skeleton, matching the Phase 0 stub behaviour.
import Fastify, { type FastifyInstance } from 'fastify';
import type { Firestore } from 'firebase-admin/firestore';
import type { Config } from './config.js';
import { registerErrorEnvelope } from './plugins/errorEnvelope.js';
import { registerHealthModule } from './modules/health/index.js';
import { registerListingsModule } from './modules/listings/index.js';
import { SnapshotCache } from './cache/index.js';

function buildLoggerOptions(config: Config) {
  // pino is Fastify's native logger. Pretty console in development,
  // structured JSON (Cloud Run) in production. request-id on every line.
  if (config.isProduction) {
    return { level: config.PVPDASH_LOG_LEVEL };
  }
  return {
    level: config.PVPDASH_LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  };
}

export interface BuiltApp {
  app: FastifyInstance;
  /** Present only when built with a Firestore instance. Tests use it to
   *  trigger manual rebuilds/polls and to stop the poll timer on teardown. */
  cache: SnapshotCache | null;
}

export async function buildApp(config: Config, db?: Firestore): Promise<BuiltApp> {
  const app = Fastify({
    logger: buildLoggerOptions(config),
    genReqId: () => crypto.randomUUID(),
  });

  registerErrorEnvelope(app);

  let cache: SnapshotCache | null = null;
  if (db) {
    cache = new SnapshotCache(db, {
      metaPollSeconds: config.PVPDASH_META_POLL_SECONDS,
      snapshotMaxAgeHours: config.PVPDASH_SNAPSHOT_MAX_AGE_HOURS,
      logger: app.log,
    });
    await cache.init();
    cache.startPolling();

    const primedCache = cache;
    await app.register(
      async (instance) => {
        registerListingsModule(instance, { cache: primedCache, db });
      },
      { prefix: '/api' },
    );
  }

  registerHealthModule(app, cache ? { isReady: () => cache!.isReady() } : {});

  await app.ready();
  return { app, cache };
}
