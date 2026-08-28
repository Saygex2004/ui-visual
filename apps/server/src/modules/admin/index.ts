// Admin module (API_CONTRACT.md §8) — accounts lifecycle, events, and runs
// listing. Categories live in their own module (modules/settings) per
// SPECIFICATIONS.md §2; calendar admin routes belong to Phase 8. Every route
// requires the admin role (config.auth.role).
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  CreateUserRequestSchema,
  SetPasswordRequestSchema,
  SetRoleRequestSchema,
  SetVisteRequestSchema,
  SetVisteStatiRequestSchema,
  type AdminUser,
  type UserPublic,
  type Vista,
} from '@pvp/shared';
import {
  usersRepo,
  sessionsRepo,
  adminEventsRepo,
  runsRepo,
  visteStatiRepo,
} from '../../repositories/index.js';
import { hashPassword } from '../../lib/passwords.js';
import { UsernameTakenError } from '../../repositories/users.js';
import { ApiError } from '../../plugins/errorEnvelope.js';
import type { VisteStatiCache } from '../../plugins/visteStatiCache.js';

function toAdminView(user: {
  id: string;
  username: string;
  role: 'user' | 'admin';
  disabled: boolean;
  must_change_password: boolean;
  created_at: string;
  viste: Vista[];
}): AdminUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    disabled: user.disabled,
    must_change_password: user.must_change_password,
    created_at: user.created_at,
    viste: user.viste,
  };
}

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

export interface AdminModuleDeps {
  db: Firestore;
  /** Kept in step on write, so the instance that flips a switch does not
   *  keep serving its own previous answer for the rest of the window. */
  visteStati?: VisteStatiCache;
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

  app.post<{ Params: { id: string } }>('/admin/users/:id/viste', adminOnly, async (req) => {
    const { id } = req.params;
    const target = await usersRepo.getById(db, id);
    if (!target) throw new ApiError(404, 'errors.common.notFound');

    const parsed = SetVisteRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'errors.common.validation');

    // Deduplicated: the client sends the checked boxes, and a repeated code
    // would otherwise be stored and shown back as a duplicate row.
    const viste = [...new Set(parsed.data.viste)];
    await usersRepo.setViste(db, id, viste);
    await adminEventsRepo.append(db, {
      type: 'viste_changed',
      actor_id: req.user!.id,
      subject: id,
      details: { from: target.viste, to: viste },
    });
    return { user: toAdminView({ ...target, viste }) };
  });

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

  app.get('/admin/runs', adminOnly, async () => {
    const runs = await runsRepo.getRecent(db);
    return { runs };
  });

  // ── The view switches ──
  //
  // Distinct from the per-account grants, which say who MAY open a view:
  // this says whether the view is open at all. Closing one for work therefore
  // touches nobody's permissions, and reopening it restores them exactly.
  app.get('/admin/viste/stati', adminOnly, async () => ({
    stati: (await visteStatiRepo.get(db))?.stati ?? {},
  }));

  app.put('/admin/viste/stati', adminOnly, async (req) => {
    const body = SetVisteStatiRequestSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, 'errors.common.validation');
    const salvato = await visteStatiRepo.set(db, body.data, req.user!.id);
    deps.visteStati?.invalidate(salvato.stati);
    await adminEventsRepo.append(db, {
      type: 'viste_stati_changed',
      actor_id: req.user!.id,
      subject: 'viste_config/stati',
      details: body.data.stati,
    });
    return { stati: salvato.stati };
  });
}
