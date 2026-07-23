// Activity event vocabulary (DATA_MODEL.md §12) and admin event vocabulary
// (§15) — closed sets in v1. Extending is additive; renaming/reusing is not.

export const ACTIVITY_EVENT_TYPES = [
  'rating_set',
  'rating_changed',
  'rating_cleared',
  'thread_opened',
  'thread_closed',
  'thread_reopened',
  'attachment_added',
  'calendar_assigned',
  'calendar_removed',
  'listing_archived',
  'listing_reactivated',
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const ADMIN_EVENT_TYPES = [
  'account_created',
  'password_changed',
  'role_changed',
  'account_disabled',
  'account_enabled',
  'categories_changed',
] as const;

export type AdminEventType = (typeof ADMIN_EVENT_TYPES)[number];
