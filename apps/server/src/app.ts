// Application factory: builds a configured Fastify instance without listening,
// so tests can inject requests against it.
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config.js';
import { registerErrorEnvelope } from './plugins/errorEnvelope.js';
import { registerHealthModule } from './modules/health/index.js';

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

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(config),
    genReqId: () => crypto.randomUUID(),
  });

  registerErrorEnvelope(app);
  registerHealthModule(app);

  await app.ready();
  return app;
}
