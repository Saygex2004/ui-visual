// Letter-template overrides for the carta intestata view.
//
// Reads are open to anyone holding the `carta` view — the templates ARE the
// documents that view produces, so it cannot work without them. Writes are
// admin-only: this is boilerplate that ends up in signed instruments, and
// editing it is an administrative act, not part of drafting one letter.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  CartaAziendaPatchSchema,
  CreateCartaAziendaRequestSchema,
  SetCartaFirmatariRequestSchema,
  SetCartaTemplateRequestSchema,
  TipoTemplateSchema,
} from '@pvp/shared';
import {
  cartaTemplateRepo,
  cartaFirmatariRepo,
  cartaAziendaRepo,
  adminEventsRepo,
} from '../../repositories/index.js';
import { ApiError } from '../../plugins/errorEnvelope.js';

export interface CartaModuleDeps {
  db: Firestore;
}

export function registerCartaModule(app: FastifyInstance, deps: CartaModuleDeps): void {
  const { db } = deps;
  const richiedeVista = { config: { auth: { vista: 'carta' as const } } };
  const adminOnly = { config: { auth: { role: 'admin' as const } } };

  app.get('/carta/templates', richiedeVista, async () => ({
    templates: await cartaTemplateRepo.listAll(db),
  }));

  app.put<{ Params: { tipo: string } }>('/carta/templates/:tipo', adminOnly, async (req) => {
    const tipo = TipoTemplateSchema.safeParse(req.params.tipo);
    if (!tipo.success) throw new ApiError(404, 'errors.common.notFound');
    const body = SetCartaTemplateRequestSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, 'errors.common.validation');

    const template = await cartaTemplateRepo.set(db, tipo.data, body.data, req.user!.id);
    // Logged like the other administrative writes: this changes the wording
    // of documents the company signs, so who changed it and when matters.
    await adminEventsRepo.append(db, {
      type: 'carta_template_changed',
      actor_id: req.user!.id,
      subject: `carta_template/${tipo.data}`,
      details: {},
    });
    return { template };
  });

  app.delete<{ Params: { tipo: string } }>(
    '/carta/templates/:tipo',
    adminOnly,
    async (req, reply) => {
      const tipo = TipoTemplateSchema.safeParse(req.params.tipo);
      if (!tipo.success) throw new ApiError(404, 'errors.common.notFound');
      await cartaTemplateRepo.reset(db, tipo.data);
      await adminEventsRepo.append(db, {
        type: 'carta_template_changed',
        actor_id: req.user!.id,
        subject: `carta_template/${tipo.data}`,
        details: { reset: true },
      });
      return reply.code(204).send();
    },
  );

  // ── Who may sign ──
  //
  // Read with the view (the drafting form offers these names), written by an
  // administrator: a signatory list is a statement about who can bind the
  // company, not a drafting convenience.
  app.get('/carta/firmatari', richiedeVista, async () => ({
    anagrafica: await cartaFirmatariRepo.get(db),
  }));

  app.put('/carta/firmatari', adminOnly, async (req) => {
    const body = SetCartaFirmatariRequestSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, 'errors.common.validation');
    const anagrafica = await cartaFirmatariRepo.set(db, body.data, req.user!.id);
    await adminEventsRepo.append(db, {
      type: 'carta_firmatari_changed',
      actor_id: req.user!.id,
      subject: 'carta_anagrafica/firmatari',
      details: { firmatari: body.data.firmatari.length, qualifiche: body.data.qualifiche.length },
    });
    return { anagrafica };
  });

  app.delete('/carta/firmatari', adminOnly, async (req, reply) => {
    await cartaFirmatariRepo.reset(db);
    await adminEventsRepo.append(db, {
      type: 'carta_firmatari_changed',
      actor_id: req.user!.id,
      subject: 'carta_anagrafica/firmatari',
      details: { reset: true },
    });
    return reply.code(204).send();
  });

  // ── Companies added on top of the shipped ones ──
  //
  // Read with the view: the drafting form offers them as senders and fills
  // recipients from them. Written by an administrator: what appears here is a
  // registered office and a tax code printed on a signed letter.
  app.get('/carta/aziende', richiedeVista, async () => ({
    aziende: await cartaAziendaRepo.listAll(db),
  }));

  app.post('/carta/aziende', adminOnly, async (req, reply) => {
    const body = CreateCartaAziendaRequestSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, 'errors.common.validation');
    const azienda = await cartaAziendaRepo.create(db, body.data, req.user!.id);
    await adminEventsRepo.append(db, {
      type: 'carta_azienda_changed',
      actor_id: req.user!.id,
      subject: `carta_azienda/${azienda.id}`,
      // The name, not the record: an admin event is a trail of what happened,
      // and a logo would put a few hundred KB of base64 into every listing.
      details: { nome: azienda.nome, creata: true },
    });
    reply.code(201);
    return { azienda };
  });

  app.patch<{ Params: { id: string } }>('/carta/aziende/:id', adminOnly, async (req) => {
    const body = CartaAziendaPatchSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, 'errors.common.validation');
    const azienda = await cartaAziendaRepo.patch(db, req.params.id, body.data, req.user!.id);
    if (!azienda) throw new ApiError(404, 'errors.common.notFound');
    await adminEventsRepo.append(db, {
      type: 'carta_azienda_changed',
      actor_id: req.user!.id,
      subject: `carta_azienda/${azienda.id}`,
      details: { nome: azienda.nome },
    });
    return { azienda };
  });

  app.delete<{ Params: { id: string } }>('/carta/aziende/:id', adminOnly, async (req, reply) => {
    const removed = await cartaAziendaRepo.remove(db, req.params.id);
    if (!removed) throw new ApiError(404, 'errors.common.notFound');
    await adminEventsRepo.append(db, {
      type: 'carta_azienda_changed',
      actor_id: req.user!.id,
      subject: `carta_azienda/${req.params.id}`,
      details: { eliminata: true },
    });
    return reply.code(204).send();
  });
}
