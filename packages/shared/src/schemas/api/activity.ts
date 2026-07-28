// API — the listing activity timeline (API_CONTRACT.md §3, UI §4.5). Extends
// the stored `ActivityEventSchema` with a resolved `actor_username`: `actor_id`
// is an opaque user id (DATA_MODEL.md §12), and the only endpoint that maps an
// id to a username is admin-only (`GET /admin/users`) — a non-admin opening a
// colleague's rating history has no other way to resolve it, so the server
// resolves it once here.
import { z } from 'zod';
import { ActivityEventSchema } from '../partB/activity.js';

export const ActivityEventViewSchema = ActivityEventSchema.extend({
  actor_username: z.string().nullable(),
});

export const ActivityListResponseSchema = z.object({
  events: z.array(ActivityEventViewSchema),
});

export type ActivityEventView = z.infer<typeof ActivityEventViewSchema>;
export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
