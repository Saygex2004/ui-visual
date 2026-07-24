// Admin module (API_CONTRACT.md §8) — accounts lifecycle + events listing this
// phase. Categories/calendar/runs admin routes belong to Phases 5/8; not
// scaffolded here. Every route requires the admin role (config.auth.role).
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  CreateUserRequestSchema,
  SetPasswordRequestSchema,
  SetRoleRequestSchema,
  type AdminUser,
  type UserPublic,
} from '@pvp/shared';
import { usersRepo, sessionsRepo, adminEventsRepo } from '../../repositories/index.js';
import { hashPassword } from '../../lib/passwords.js';
import { UsernameTakenError } from '../../repositories/users.js';
import { ApiError } from '../../plugins/errorEnvelope.js';

function toAdminView(user: {
  id: string;
  username: string;
  role: 'user' | 'admin';
  disabled: boolean;
  must_change_password: boolean;
  created_at: string;
}): AdminUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    disabled: user.disabled,
    must_change_password: user.must_change_password,
    created_at: user.created_at,
  };
}

function toPublic(user: {
  id: string;
  username: string;
  role: 'user' | 'admin';
  must_change_password: boolean;
}): UserPublic {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    must_change_password: user.must_change_password,
  };
}

export interface AdminModuleDeps {
  db: Firestore;
}

export function registerAdminModule(app: FastifyInstance, deps: AdminModuleDeps): void {
  const { db } = deps;
  const adminOnly = { config: { auth: { role: 'admin' as const } } };

  app.get('/admin/users', adminOnly, async () => {
    const users = await usersRepo.listAll(db);
    return { users: users.map(toAdminView) };
  });

  app.post('/admin/users', adminOnly, async (req, reply) => {
    const body = CreateUserRequestSchema.parse(req.body);
    const passwordHash = await hashPassword(body.password);

    let created;
    try {
      created = await usersRepo.create(db, {
        username: body.username,
        passwordHash,
        role: body.role,
        mustChangePassword: true,
      });
    } catch (err) {
      if (err instanceof UsernameTakenError) {
        throw new ApiError(409, 'errors.admin.usernameTaken');
      }
      throw err;
    }

    await adminEventsRepo.append(db, {
      type: 'account_created',
      actor_id: req.user!.id,
      subject: created.id,
      details: { role: created.role },
    });

    reply.code(201);
    return { user: toPublic(created) };
  });

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/password',
    adminOnly,
    async (req, reply) => {
      const { id } = req.params;
      const target = await usersRepo.getById(db, id);
      if (!target) throw new ApiError(404, 'errors.common.notFound');

      const body = SetPasswordRequestSchema.parse(req.body);
      const newHash = await hashPassword(body.new_password);
      await usersRepo.setPasswordHash(db, id, newHash, true);
      await sessionsRepo.deleteAllForUser(db, id);
      await adminEventsRepo.append(db, {
        type: 'password_changed',
        actor_id: req.user!.id,
        subject: id,
      });

      return reply.code(204).send();
    },
  );

  app.post<{ Params: { id: string } }>('/admin/users/:id/role', adminOnly, async (req) => {
    const { id } = req.params;
    const target = await usersRepo.getById(db, id);
    if (!target) throw new ApiError(404, 'errors.common.notFound');

    const body = SetRoleRequestSchema.parse(req.body);
    if (body.role !== 'admin' && (await usersRepo.isLastActiveAdmin(db, id))) {
      throw new ApiError(409, 'errors.admin.lastAdmin');
    }

    await usersRepo.setRole(db, id, body.role);
    await adminEventsRepo.append(db, {
      type: 'role_changed',
      actor_id: req.user!.id,
      subject: id,
      details: { from: target.role, to: body.role },
    });

    const updated = await usersRepo.getById(db, id);
    return { user: toAdminView(updated!) };
  });

  app.post<{ Params: { id: string } }>('/admin/users/:id/disable', adminOnly, async (req) => {
    const { id } = req.params;
    const target = await usersRepo.getById(db, id);
    if (!target) throw new ApiError(404, 'errors.common.notFound');

    if (await usersRepo.isLastActiveAdmin(db, id)) {
      throw new ApiError(409, 'errors.admin.lastAdmin');
    }

    await usersRepo.setDisabled(db, id, true);
    await sessionsRepo.deleteAllForUser(db, id);
    await adminEventsRepo.append(db, {
      type: 'account_disabled',
      actor_id: req.user!.id,
      subject: id,
    });

    const updated = await usersRepo.getById(db, id);
    return { user: toAdminView(updated!) };
  });

  app.post<{ Params: { id: string } }>('/admin/users/:id/enable', adminOnly, async (req) => {
    const { id } = req.params;
    const target = await usersRepo.getById(db, id);
    if (!target) throw new ApiError(404, 'errors.common.notFound');

    await usersRepo.setDisabled(db, id, false);
    await adminEventsRepo.append(db, {
      type: 'account_enabled',
      actor_id: req.user!.id,
      subject: id,
    });

    const updated = await usersRepo.getById(db, id);
    return { user: toAdminView(updated!) };
  });

  app.get('/admin/events', adminOnly, async () => {
    const events = await adminEventsRepo.listRecent(db);
    return { events };
  });
}
