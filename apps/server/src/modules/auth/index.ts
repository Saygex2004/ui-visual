// Auth module (API_CONTRACT.md §2): login, logout, me, self password change.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  LoginRequestSchema,
  PasswordChangeRequestSchema,
  type UserPublic,
  type Vista,
} from '@pvp/shared';
import { usersRepo, sessionsRepo } from '../../repositories/index.js';
import { hashPassword, verifyPassword, verifyDummyPassword } from '../../lib/passwords.js';
import { setSessionCookie, clearSessionCookie } from '../../plugins/auth.js';
import { ApiError } from '../../plugins/errorEnvelope.js';
import type { VisteStatiCache } from '../../plugins/visteStatiCache.js';

function toPublic(user: {
  id: string;
  username: string;
  role: 'user' | 'admin';
  must_change_password: boolean;
  viste: Vista[];
}): UserPublic {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    must_change_password: user.must_change_password,
    viste: user.viste,
  };
}

export interface AuthModuleDeps {
  db: Firestore;
  sessionTtlDays: number;
  isProduction: boolean;
  /** The view switches, so the client can render the landing correctly.
   *  Absent = every view open. */
  visteStati?: VisteStatiCache;
}

export function registerAuthModule(app: FastifyInstance, deps: AuthModuleDeps): void {
  const { db, sessionTtlDays, isProduction } = deps;

  app.post('/auth/login', { config: { auth: { public: true } } }, async (req, reply) => {
    const body = LoginRequestSchema.parse(req.body);
    const user = await usersRepo.getByUsername(db, body.username);

    // Identical error for unknown user and wrong password (API_CONTRACT.md
    // §2) — including a dummy-hash verify on the unknown-user path so the
    // response takes the same time either way (argon2's cost is what makes
    // the gap observable otherwise).
    if (!user) {
      await verifyDummyPassword(body.password);
      throw new ApiError(401, 'errors.auth.invalidCredentials');
    }
    const passwordOk = await verifyPassword(user.password_hash, body.password);
    // Disabled accounts fail the same generic way — revealing "this account
    // exists but is disabled" would itself leak account state.
    if (!passwordOk || user.disabled) {
      throw new ApiError(401, 'errors.auth.invalidCredentials');
    }

    const session = await sessionsRepo.create(db, user.id, sessionTtlDays);
    setSessionCookie(reply, session.token, { ttlDays: sessionTtlDays, isProduction });
    return { user: toPublic(user) };
  });

  app.post('/auth/logout', { config: { auth: { allowMustChange: true } } }, async (req, reply) => {
    if (req.sessionHash) {
      await sessionsRepo.deleteByHash(db, req.sessionHash);
    }
    clearSessionCookie(reply);
    reply.code(204);
    return reply.send();
  });

  app.get('/auth/me', { config: { auth: { allowMustChange: true } } }, async (req) => {
    // The switches ride along with the account rather than on an endpoint of
    // their own: the client needs both together to decide what to draw, this
    // is the one call every session already makes, and the value is cached —
    // so it costs nothing per session.
    // They are NOT the permission boundary and are not treated as one here:
    // the server checks them again on every route that names a view.
    // req.user is always set here — the route requires a session.
    return { user: req.user!, viste_stati: (await deps.visteStati?.stati()) ?? {} };
  });

  app.post(
    '/auth/password',
    { config: { auth: { allowMustChange: true } } },
    async (req, reply) => {
      const body = PasswordChangeRequestSchema.parse(req.body);
      const user = await usersRepo.getById(db, req.user!.id);
      if (!user) throw new ApiError(401, 'errors.auth.unauthenticated');

      const currentOk = await verifyPassword(user.password_hash, body.current_password);
      if (!currentOk) throw new ApiError(401, 'errors.auth.invalidCredentials');

      const newHash = await hashPassword(body.new_password);
      await usersRepo.setPasswordHash(db, user.id, newHash, false);
      // Self-service: keep the session performing this change alive, revoke
      // every other one (API_CONTRACT.md §2).
      await sessionsRepo.deleteOtherSessionsForUser(db, user.id, req.sessionHash!);

      // Explicit empty send — a return value would serialize a body even on
      // 204 (Fastify does not suppress it for us; same lesson as Phase 2's
      // 304 handling).
      return reply.code(204).send();
    },
  );
}
