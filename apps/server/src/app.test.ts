import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const TEST_ENV = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'pvp-dashboard-test',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
  PVPDASH_ENV: 'production', // silence pino-pretty transport in tests
  PVPDASH_LOG_LEVEL: 'silent',
} satisfies NodeJS.ProcessEnv;

describe('server bootstrap', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // No Firestore instance: pure offline unit test (TESTING.md §1) — health
    // and the error envelope stay independent of the data layer.
    ({ app } = await buildApp(loadConfig(TEST_ENV)));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers GET /healthz with 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('answers GET /readyz with 200 when built without a data layer', async () => {
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', checks: {} });
  });

  it('returns the error envelope shape for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 404, key: 'errors.common.notFound', details: {} },
    });
  });
});

describe('config validation', () => {
  it('refuses malformed config, naming the offending variable', () => {
    expect(() =>
      loadConfig({ PVPDASH_FIRESTORE_PROJECT_ID: 'x', PVPDASH_SESSION_SECRET: 'too-short' }),
    ).toThrow(/PVPDASH_SESSION_SECRET/);
  });
});
