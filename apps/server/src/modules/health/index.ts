// Health module: liveness (/healthz) and a stub readiness (/readyz).
// Both are exempt from authentication (API_CONTRACT.md §1).
import type { FastifyInstance } from 'fastify';

export function registerHealthModule(app: FastifyInstance): void {
  app.get('/healthz', async () => ({ status: 'ok' }));

  // Readiness is a stub in Phase 0: real dependency checks (Firestore reach,
  // snapshot cache warm) are wired in later phases.
  app.get('/readyz', async () => ({ status: 'ok', checks: {} }));
}
