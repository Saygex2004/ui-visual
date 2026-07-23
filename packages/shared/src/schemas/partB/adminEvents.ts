// Part B — `admin_events` (DATA_MODEL.md §15). Append-only lifecycle audit.
import { z } from 'zod';
import { instant } from '../common.js';
import { ADMIN_EVENT_TYPES } from '../../constants/activity.js';

export const AdminEventTypeSchema = z.enum(ADMIN_EVENT_TYPES);

export const AdminEventSchema = z.object({
  type: AdminEventTypeSchema,
  actor_id: z.string(),
  subject: z.string(), // user id or 'settings/extraction_categories'
  at: instant,
  details: z.record(z.string(), z.unknown()),
});

export type AdminEvent = z.infer<typeof AdminEventSchema>;
