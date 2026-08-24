// Typed fetch client over the shared API contract (FRONTEND.md §3). Every
// request carries the session cookie (`credentials: 'include'`); every
// non-2xx response is parsed against the shared error-envelope schema and
// thrown as an ApiError the UI can resolve through the `errors` i18n
// namespace — the server never composes user-facing prose (API_CONTRACT.md §1).
import { ErrorEnvelopeSchema } from '@pvp/shared';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly key: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, key: string, details: Record<string, unknown>) {
    super(key);
    this.name = 'ApiError';
    this.status = status;
    this.key = key;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const parsed = ErrorEnvelopeSchema.safeParse(body);
    if (parsed.success) {
      throw new ApiError(parsed.data.error.code, parsed.data.error.key, parsed.data.error.details);
    }
    throw new ApiError(res.status, 'errors.common.unknown', {});
  }

  return body as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    // Fastify's default JSON body parser rejects a zero-length body when
    // Content-Type is application/json (FST_ERR_CTP_EMPTY_JSON_BODY, 400) —
    // only send the header when there is actually a body (e.g. not on the
    // bodyless /auth/logout POST).
    headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });
  return handleResponse<T>(res);
}

// API_CONTRACT.md §10's "cheap path" (snapshot, unread, calendar day: ETag/
// 304) was server-side-only until Phase 11 hardening: nothing on the client
// ever sent `If-None-Match`, so every poll transferred the full payload
// regardless — found by that phase's own e2e request-cadence assertions
// (e2e/polling-cadence.spec.ts), not assumed fixed by the server change
// alone. One small per-path cache, keyed by the exact request path (so
// `/ratings?since=...`/`/chats/:id?after=...`'s ever-changing query strings
// naturally never collide or grow unbounded — only the handful of paths
// that actually return an `ETag` — snapshot ×2 areas, unread, a few visited
// calendar dates — ever get an entry at all).
const etagCache = new Map<string, { etag: string; data: unknown }>();

async function getWithEtag<T>(path: string): Promise<T> {
  const cached = etagCache.get(path);
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: cached ? { 'If-None-Match': cached.etag } : undefined,
  });

  if (res.status === 304 && cached) {
    return cached.data as T;
  }

  const data = await handleResponse<T>(res);
  const etag = res.headers.get('ETag');
  if (etag) {
    etagCache.set(path, { etag, data });
  } else {
    etagCache.delete(path);
  }
  return data;
}

export const api = {
  get: <T>(path: string): Promise<T> => getWithEtag<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  /** Multipart upload (attachments, API_CONTRACT.md §6) — deliberately no
   *  `Content-Type` header: the browser computes the multipart boundary
   *  itself from the `FormData` body, and setting it by hand breaks the
   *  server's parsing of it. */
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse<T>(res);
  },
};
