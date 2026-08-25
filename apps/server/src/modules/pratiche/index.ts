// Pratiche module: the admin-only archived-case register (Part B write).
//
// Every route here is admin-gated, including the reads — unlike listings,
// where the data is merely internal, this register names who ordered each
// case file and is only ever meant for the people who run the archive. The
// view is hidden from non-admins in the client too, but that is presentation:
// this is where it is actually enforced.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import { CreatePraticaRequestSchema, UpdatePraticaRequestSchema } from '@pvp/shared';
import { praticheRepo, usersRepo } from '../../repositories/index.js';
import { ApiError } from '../../plugins/errorEnvelope.js';
import { notify, type SlackConfig } from './slack.js';

export interface PraticheModuleDeps {
  db: Firestore;
  /** Absent or unconfigured = notifications off. */
  slack?: SlackConfig;
}

export function registerPraticheModule(app: FastifyInstance, deps: PraticheModuleDeps): void {
  const { db, slack = {} } = deps;
  // Gated on the VIEW, not on the role: an administrator may now grant
  // "Pratiche cartacee" to a normal account, and the grant has to actually
  // mean something. Admins still pass — `hasVista` lets them through.
  const richiedeVista = { config: { auth: { vista: 'pratiche' as const } } };

  app.get('/pratiche', richiedeVista, async () => {
    // Accounts ship with the list so `ordinato_da` can render as a person
    // rather than an opaque id. Only id and username: this endpoint has no
    // business exposing roles or account state.
    const [pratiche, users] = await Promise.all([praticheRepo.listAll(db), usersRepo.listAll(db)]);
    return {
      pratiche,
      utenti: users.map((u) => ({ id: u.id, username: u.username })),
    };
  });

  // safeParse + ApiError(400), not a bare `.parse()`: a thrown ZodError
  // carries no statusCode, so the error handler would answer 500 and the
  // caller would read a bad NDG as a server fault (verified against the
  // emulator, 2026-08-24). This is the convention modules/calendar uses.
  app.post('/pratiche', richiedeVista, async (req, reply) => {
    const parsed = CreatePraticaRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'errors.common.validation');
    const pratica = await praticheRepo.create(db, parsed.data, req.user!.id);
    // AWAITED, not fire-and-forget. Cloud Run throttles a container's CPU to
    // near zero the moment the response is sent, so a promise left running
    // after `return` is simply cut off — sometimes it wins the race, usually
    // not. That shipped as "some notifications arrive, some don't", with no
    // error logged anywhere because the fetch never got far enough to fail.
    // `notify` never throws and carries its own 5s timeout, so awaiting it
    // bounds the request instead of risking it.
    await notify(slack, pratica, { kind: 'creata' }, req.log);
    reply.code(201);
    return { pratica };
  });

  app.patch<{ Params: { id: string } }>('/pratiche/:id', richiedeVista, async (req) => {
    const parsed = UpdatePraticaRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'errors.common.validation');
    // Read before writing so the notification can name what actually changed;
    // a patch that leaves `stato` alone must not announce a transition.
    const prima = await praticheRepo.getById(db, req.params.id);
    const pratica = await praticheRepo.patch(db, req.params.id, parsed.data, req.user!.id);
    if (!pratica) throw new ApiError(404, 'errors.common.notFound');
    if (prima && prima.stato !== pratica.stato) {
      await notify(slack, pratica, { kind: 'stato', precedente: prima.stato }, req.log);
    }
    return { pratica };
  });

  app.delete<{ Params: { id: string } }>('/pratiche/:id', richiedeVista, async (req, reply) => {
    const removed = await praticheRepo.remove(db, req.params.id);
    if (!removed) throw new ApiError(404, 'errors.common.notFound');
    return reply.code(204).send();
  });
}
