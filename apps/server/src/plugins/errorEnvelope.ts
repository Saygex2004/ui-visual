// Error-envelope plugin (API_CONTRACT.md §1).
// Every non-2xx response carries: { "error": { "code", "key", "details" } }.
// `key` is an i18n key from the shared `errors` namespace — the server never
// composes user-facing prose.
import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export interface ErrorEnvelope {
  error: {
    code: number;
    key: string;
    details: Record<string, unknown>;
  };
}

/** Thrown by handlers to produce a specific envelope. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly key: string;
  readonly details: Record<string, unknown>;

  constructor(statusCode: number, key: string, details: Record<string, unknown> = {}) {
    super(key);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.key = key;
    this.details = details;
  }
}

function keyForStatus(status: number): string {
  if (status === 401) return 'errors.auth.unauthenticated';
  if (status === 403) return 'errors.auth.forbidden';
  if (status === 404) return 'errors.common.notFound';
  if (status === 400 || status === 422) return 'errors.common.validation';
  if (status >= 500) return 'errors.common.internal';
  return 'errors.common.unknown';
}

export function registerErrorEnvelope(app: FastifyInstance): void {
  app.setNotFoundHandler((_req: FastifyRequest, reply: FastifyReply) => {
    const body: ErrorEnvelope = {
      error: { code: 404, key: 'errors.common.notFound', details: {} },
    };
    reply.code(404).send(body);
  });

  app.setErrorHandler((err: FastifyError | ApiError, req: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof ApiError) {
      const body: ErrorEnvelope = {
        error: { code: err.statusCode, key: err.key, details: err.details },
      };
      reply.code(err.statusCode).send(body);
      return;
    }

    const status = err.statusCode ?? 500;
    if (status >= 500) {
      req.log.error({ err }, 'unhandled error');
    }
    const body: ErrorEnvelope = {
      error: {
        code: status,
        key: keyForStatus(status),
        details: err.validation ? { validation: err.validation } : {},
      },
    };
    reply.code(status).send(body);
  });
}
