// Application factory: builds a configured Fastify instance without listening,
// so tests can inject requests against it. When `db` is supplied, the data
// layer (snapshot cache + auth + admin + listings routes) is wired in and
// readiness becomes cache-driven; without it (pure offline unit tests) the app
// stays a health-and-error-envelope skeleton, matching the Phase 0 stub
// behaviour. Bootstrap (SPECIFICATIONS.md §7) runs here too, ahead of route
// registration, so it is fatal (throws) before the server ever listens.
import Fastify, { type FastifyInstance } from 'fastify';
import type { Firestore } from 'firebase-admin/firestore';
import type { Config } from './config.js';
import { registerErrorEnvelope } from './plugins/errorEnvelope.js';
import { registerHealthModule } from './modules/health/index.js';
import { registerListingsModule } from './modules/listings/index.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerAuthModule } from './modules/auth/index.js';
import { registerAdminModule } from './modules/admin/index.js';
import { registerSettingsModule } from './modules/settings/index.js';
import { registerPraticheModule } from './modules/pratiche/index.js';
import { registerRatingsModule } from './modules/ratings/index.js';
import { registerActivityModule } from './modules/activity/index.js';
import { registerChatModule } from './modules/chat/index.js';
import { registerAttachmentsModule, sweepOrphanAttachments } from './modules/attachments/index.js';
import { registerCalendarModule } from './modules/calendar/index.js';
import { registerAdminCalendarModule } from './modules/admin/calendar.js';
import { SnapshotCache } from './cache/index.js';
import { bootstrapAdmin } from './bootstrap.js';
import { getBucket } from './storage.js';

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
    await bootstrapAdmin(db, config.PVPDASH_BOOTSTRAP_ADMIN_PASSWORD, app.log);

    cache = new SnapshotCache(db, {
      metaPollSeconds: config.PVPDASH_META_POLL_SECONDS,
      snapshotMaxAgeHours: config.PVPDASH_SNAPSHOT_MAX_AGE_HOURS,
      logger: app.log,
    });
    await cache.init();
    cache.startPolling();

    const bucket = getBucket(config.PVPDASH_FIRESTORE_PROJECT_ID, config.PVPDASH_STORAGE_BUCKET);
    try {
      const swept = await sweepOrphanAttachments(db, bucket);
      if (swept > 0) app.log.info({ swept }, 'swept orphaned attachment uploads');
    } catch (err) {
      // Best-effort cleanup — never blocks startup (SPECIFICATIONS.md §15's
      // "fail closed and loud" is for correctness-critical paths; this isn't
      // one, the same reasoning the snapshot cache applies to a failed rebuild).
      app.log.warn({ err }, 'orphan attachment sweep failed, continuing startup');
    }

    const primedCache = cache;
    await app.register(
      async (instance) => {
        await registerAuthPlugin(instance, {
          db,
          cookieSecret: config.PVPDASH_SESSION_SECRET,
          sessionTtlDays: config.PVPDASH_SESSION_TTL_DAYS,
          isProduction: config.isProduction,
        });
        registerAuthModule(instance, {
          db,
          sessionTtlDays: config.PVPDASH_SESSION_TTL_DAYS,
          isProduction: config.isProduction,
        });
        registerAdminModule(instance, { db });
        registerAdminCalendarModule(instance, { db });
        registerCalendarModule(instance, { db });
        registerSettingsModule(instance, { db, cache: primedCache });
        registerPraticheModule(instance, {
          db,
          slack: {
            webhookUrl: config.PVPDASH_SLACK_WEBHOOK_URL,
            mentionId: config.PVPDASH_SLACK_MENTION_ID,
            baseUrl: config.PVPDASH_PUBLIC_BASE_URL,
          },
        });
        registerRatingsModule(instance, { db });
        registerActivityModule(instance, { db });
        registerListingsModule(instance, { cache: primedCache, db });
        registerChatModule(instance, { db, messageMaxChars: config.PVPDASH_MESSAGE_MAX_CHARS });
        await registerAttachmentsModule(instance, {
          db,
          bucket,
          maxBytes: config.PVPDASH_ATTACH_MAX_MB * 1024 * 1024,
          allowedTypes: config.PVPDASH_ATTACH_TYPES,
          signedUrlTtlMinutes: config.PVPDASH_SIGNED_URL_TTL_MINUTES,
        });
      },
      { prefix: '/api' },
    );
  }

  registerHealthModule(app, cache ? { isReady: () => cache!.isReady() } : {});

  await app.ready();
  return { app, cache };
}
