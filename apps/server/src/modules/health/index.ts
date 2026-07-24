// Health module: liveness (/healthz) and readiness (/readyz). Both are exempt
// from authentication (API_CONTRACT.md §1, §9). `/readyz` reports ready only
// when the data layer (snapshot cache) is primed — Cloud Run's readiness probe
// and the runbook's first check depend on this being accurate, not a stub.
import type { FastifyInstance } from 'fastify';

export interface HealthDeps {
  /** Absent (offline/no-data-layer contexts) ⇒ always ready, preserving the
   *  Phase 0 stub behaviour for tests that build an app without Firestore. */
  isReady?: () => boolean;
}

export function registerHealthModule(app: FastifyInstance, deps: HealthDeps = {}): void {
  const isReady = deps.isReady ?? (() => true);

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/readyz', async (_req, reply) => {
    if (!isReady()) {
      reply.code(503);
      return { status: 'not_ready', checks: {} };
    }
    return { status: 'ok', checks: {} };
  });
}
