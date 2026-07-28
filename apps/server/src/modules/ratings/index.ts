// Ratings module (API_CONTRACT.md §4, UI §5). No `config.auth.role` — any
// authenticated, non-must-change session may rate (same default gate as
// `modules/listings`), matching "the rating is collective" (any team member).
// PUT/DELETE do three sequential Firestore operations (rating write →
// completion recording → activity append), not one spanning transaction —
// the same sequential-not-atomic shape `modules/admin`'s password-change
// route already uses (setPasswordHash → deleteAllForUser → adminEventsRepo
// append): the activity log is a supplementary audit trail, not the rating's
// source of truth, so a crash between steps is low-probability and low-
// consequence, not worth the added complexity of a cross-collection transaction.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  RatingsDeltaResponseSchema,
  SetRatingRequestSchema,
  SetRatingResponseSchema,
} from '@pvp/shared';
import { ratingsRepo, assignmentIndexRepo, activityRepo } from '../../repositories/index.js';

export interface RatingsModuleDeps {
  db: Firestore;
}

export function registerRatingsModule(app: FastifyInstance, deps: RatingsModuleDeps): void {
  const { db } = deps;

  app.get<{ Querystring: { since?: string } }>('/ratings', async (req) => {
    const result = await ratingsRepo.getSince(db, req.query.since ?? null);
    return RatingsDeltaResponseSchema.parse(result);
  });

  app.put<{ Params: { listingId: string } }>('/ratings/:listingId', async (req) => {
    const { listingId } = req.params;
    const body = SetRatingRequestSchema.parse(req.body);

    const { rating, previous } = await ratingsRepo.setValue(db, listingId, {
      value: body.value,
      setBy: req.user!.id,
    });
    await assignmentIndexRepo.ensureCompleted(db, listingId);
    await activityRepo.appendEvent(db, {
      listing_id: listingId,
      type: previous === null ? 'rating_set' : 'rating_changed',
      actor_id: req.user!.id,
      details: previous === null ? { value: body.value } : { from: previous.value, to: body.value },
    });

    return SetRatingResponseSchema.parse({ rating });
  });

  app.delete<{ Params: { listingId: string } }>('/ratings/:listingId', async (req, reply) => {
    const { listingId } = req.params;
    const cleared = await ratingsRepo.clear(db, listingId);
    if (cleared !== null) {
      await activityRepo.appendEvent(db, {
        listing_id: listingId,
        type: 'rating_cleared',
        actor_id: req.user!.id,
        details: { value: cleared.value },
      });
    }
    return reply.code(204).send();
  });
}
