// Event type + details → i18n key + interpolation params (UI §4.5's timeline,
// DATA_MODEL.md §12's closed 11-value vocabulary). Pure — takes a
// `translateRating` callback rather than calling `useTranslation` itself, so
// it's testable with a trivial stub instead of the real i18next instance
// (mirrors translateApiError.ts's own small, separately-testable
// key-resolution helper).
import type { ActivityEventView } from '@pvp/shared';

export interface ActivityLabel {
  key: string;
  params: Record<string, string>;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function activityLabelFor(
  event: ActivityEventView,
  translateRating: (value: string) => string,
): ActivityLabel {
  const d = event.details;
  switch (event.type) {
    case 'rating_set':
      return { key: 'activity.event.rating_set', params: { value: translateRating(str(d.value)) } };
    case 'rating_changed':
      return {
        key: 'activity.event.rating_changed',
        params: { from: translateRating(str(d.from)), to: translateRating(str(d.to)) },
      };
    case 'rating_cleared':
      return {
        key: 'activity.event.rating_cleared',
        params: { value: translateRating(str(d.value)) },
      };
    case 'thread_opened':
      return { key: 'activity.event.thread_opened', params: {} };
    case 'thread_closed':
      return { key: 'activity.event.thread_closed', params: {} };
    case 'thread_reopened':
      return { key: 'activity.event.thread_reopened', params: {} };
    case 'attachment_added':
      return { key: 'activity.event.attachment_added', params: { filename: str(d.filename) } };
    case 'calendar_assigned':
      return { key: 'activity.event.calendar_assigned', params: { date: str(d.date) } };
    case 'calendar_removed':
      return { key: 'activity.event.calendar_removed', params: {} };
    case 'listing_archived':
      return { key: 'activity.event.listing_archived', params: {} };
    case 'listing_reactivated':
      return { key: 'activity.event.listing_reactivated', params: {} };
  }
}
