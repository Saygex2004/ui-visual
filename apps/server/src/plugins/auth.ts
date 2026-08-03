// Auth plugin (SPECIFICATIONS.md §7, API_CONTRACT.md §1-§2). Registers signed
// session cookies and a preHandler hook enforcing: a session is required on
// every route except those marked `config.auth.public`; while
// `must_change_password` is set, every route except those marked
// `config.auth.allowMustChange` answers 403; a route may additionally require
// `config.auth.role`. Authorization is server-side only — the client hiding
// admin UI is a courtesy, never the control (SPECIFICATIONS.md §7).
import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Firestore } from 'firebase-admin/firestore';
import { type Role, type UserPublic } from '@pvp/shared';
import { usersRepo, sessionsRepo } from '../repositories/index.js';
import { hashSessionToken } from '../lib/sessionToken.js';
import { ApiError } from './errorEnvelope.js';

// `__session` is the ONLY cookie name Firebase Hosting's CDN forwards to the
// Cloud Run backend behind the /api/** rewrite — every other cookie is
// stripped from the request (DEPLOYMENT.md §1 topology).
export const SESSION_COOKIE_NAME = '__session';
/** Only write `last_used_at` when it is staler than this — "renewed on use"
 *  (SPECIFICATIONS.md §7) without a Firestore write on every single request. */
const RENEW_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: {
      /** No session required at all (login). */
      public?: boolean;
      /** Session required, but exempt from the must-change-password gate
       *  (API_CONTRACT.md §2: /auth/me, /auth/password, /auth/logout). */
      allowMustChange?: boolean;
      /** Minimum role required (checked after the must-change gate). */
      role?: Role;
    };
  }

  interface FastifyRequest {
    /** The authenticated account (public shape — never the password hash).
     *  Present once the preHandler hook has run for a non-public route. */
    user?: UserPublic;
    /** The current session's document id (sha256 of the raw token) — used by
     *  /auth/logout and /auth/password to target/preserve this session. */
    sessionHash?: string;
  }
}

export interface AuthPluginDeps {
  db: Firestore;
  cookieSecret: string;
  sessionTtlDays: number;
  isProduction: boolean;
}

export async function registerAuthPlugin(
  app: FastifyInstance,
  deps: AuthPluginDeps,
): Promise<void> {
  await app.register(fastifyCookie, { secret: deps.cookieSecret });

  app.addHook('preHandler', async (request, reply) => {
    const authConfig = request.routeOptions.config.auth;
    if (authConfig?.public) return;

    const raw = request.cookies[SESSION_COOKIE_NAME];
    if (!raw) throw new ApiError(401, 'errors.auth.unauthenticated');

    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid || unsigned.value === null) {
      reply.clearCookie(SESSION_COOKIE_NAME);
      throw new ApiError(401, 'errors.auth.unauthenticated');
    }

    const hash = hashSessionToken(unsigned.value);
    const session = await sessionsRepo.getByHash(deps.db, hash);
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      reply.clearCookie(SESSION_COOKIE_NAME);
      throw new ApiError(401, 'errors.auth.unauthenticated');
    }

    const user = await usersRepo.getById(deps.db, session.user_id);
    if (!user || user.disabled) {
      // Defense in depth: disabling already revokes sessions at disable-time
      // (modules/admin); a stray session surviving that is cleaned up here.
      await sessionsRepo.deleteByHash(deps.db, hash);
      reply.clearCookie(SESSION_COOKIE_NAME);
      throw new ApiError(401, 'errors.auth.unauthenticated');
    }

    request.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      must_change_password: user.must_change_password,
    };
    request.sessionHash = hash;

    if (Date.now() - new Date(session.last_used_at).getTime() > RENEW_THRESHOLD_MS) {
      await sessionsRepo.touch(deps.db, hash, deps.sessionTtlDays);
    }

    if (user.must_change_password && !authConfig?.allowMustChange) {
      throw new ApiError(403, 'errors.auth.mustChangePassword');
    }

    if (authConfig?.role && user.role !== authConfig.role) {
      throw new ApiError(403, 'errors.auth.forbidden');
    }
  });
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  opts: { ttlDays: number; isProduction: boolean },
): void {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: opts.isProduction,
    sameSite: 'lax',
    path: '/',
    signed: true,
    maxAge: opts.ttlDays * 24 * 60 * 60,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}
