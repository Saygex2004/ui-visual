// Letter-template overrides for the carta intestata view.
//
// Reads are open to anyone holding the `carta` view — the templates ARE the
// documents that view produces, so it cannot work without them. Writes are
// admin-only: this is boilerplate that ends up in signed instruments, and
// editing it is an administrative act, not part of drafting one letter.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  SetCartaFirmatariRequestSchema,
  SetCartaTemplateRequestSchema,
  TipoTemplateSchema,
} from '@pvp/shared';
import {
  cartaTemplateRepo,
  cartaFirmatariRepo,
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
}
