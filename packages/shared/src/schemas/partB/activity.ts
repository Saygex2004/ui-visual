// Part B — `listing_activity` (DATA_MODEL.md §12). Immutable, append-only.
import { z } from 'zod';
import { instant } from '../common.js';
import { ACTIVITY_EVENT_TYPES } from '../../constants/activity.js';

export const ActivityEventTypeSchema = z.enum(ACTIVITY_EVENT_TYPES);

export const ActivityEventSchema = z.object({
  listing_id: z.string(),
  type: ActivityEventTypeSchema,
  actor_id: z.string().nullable(), // null for system-observed events
  at: instant,
  details: z.record(z.string(), z.unknown()),
});

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
