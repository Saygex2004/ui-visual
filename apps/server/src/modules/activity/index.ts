// Activity module (API_CONTRACT.md §3, UI §4.5): the workspace timeline.
// `actor_id` is an opaque user id (DATA_MODEL.md §12); resolving it to a
// username needs `usersRepo`, since `GET /admin/users` (the only other id→
// username path) is admin-only and a regular team member opening a
// colleague's history has no other way to resolve it. No listing-existence
// check — an unknown id just yields an empty list; `GET /listings/:id`
// (always fetched first by the workspace) is the real 404 gatekeeper.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import { ActivityListResponseSchema, type ActivityEventView } from '@pvp/shared';
import { activityRepo, usersRepo } from '../../repositories/index.js';

export interface ActivityModuleDeps {
  db: Firestore;
}

export function registerActivityModule(app: FastifyInstance, deps: ActivityModuleDeps): void {
  const { db } = deps;

  app.get<{ Params: { id: string } }>('/listings/:id/activity', async (req) => {
    const events = await activityRepo.listByListingId(db, req.params.id);

    const actorIds = [
      ...new Set(events.map((e) => e.actor_id).filter((id): id is string => id !== null)),
    ];
    const actors = await Promise.all(actorIds.map((id) => usersRepo.getById(db, id)));
    const usernameById = new Map(
      actors.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => [u.id, u.username]),
    );

    const withActors: ActivityEventView[] = events.map((event) => ({
      ...event,
      actor_username: event.actor_id === null ? null : (usernameById.get(event.actor_id) ?? null),
    }));

    return ActivityListResponseSchema.parse({ events: withActors });
  });
}
