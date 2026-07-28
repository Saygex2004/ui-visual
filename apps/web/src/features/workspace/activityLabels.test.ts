// Event type -> i18n key/params mapping (TESTING.md §6) — no React, no
// i18next runtime; `translateRating` is a plain stub, proving the closed
// 11-value vocabulary (DATA_MODEL.md §12) is covered and that rating values
// flow through the injected cross-namespace translator rather than being
// interpolated raw.
import { describe, it, expect } from 'vitest';
import type { ActivityEventView } from '@pvp/shared';
import { activityLabelFor } from './activityLabels.js';

function event(overrides: Partial<ActivityEventView>): ActivityEventView {
  return {
    listing_id: '1001',
    type: 'rating_set',
    actor_id: 'user-1',
    actor_username: 'mario',
    at: '2026-07-02T09:00:00.000Z',
    details: {},
    ...overrides,
  };
}

const translateRating = (value: string) => `RATING:${value}`;

describe('activityLabelFor', () => {
  it('maps rating_set, translating the value', () => {
    const label = activityLabelFor(
      event({ type: 'rating_set', details: { value: 'ottimo_affare' } }),
      translateRating,
    );
    expect(label).toEqual({
      key: 'activity.event.rating_set',
      params: { value: 'RATING:ottimo_affare' },
    });
  });

  it('maps rating_changed, translating both from and to', () => {
    const label = activityLabelFor(
      event({ type: 'rating_changed', details: { from: 'da_verificare', to: 'ottimo_affare' } }),
      translateRating,
    );
    expect(label).toEqual({
      key: 'activity.event.rating_changed',
      params: { from: 'RATING:da_verificare', to: 'RATING:ottimo_affare' },
    });
  });

  it('maps rating_cleared, translating the last value', () => {
    const label = activityLabelFor(
      event({ type: 'rating_cleared', details: { value: 'da_evitare' } }),
      translateRating,
    );
    expect(label).toEqual({
      key: 'activity.event.rating_cleared',
      params: { value: 'RATING:da_evitare' },
    });
  });

  it('maps thread_opened with no params', () => {
    expect(activityLabelFor(event({ type: 'thread_opened' }), translateRating)).toEqual({
      key: 'activity.event.thread_opened',
      params: {},
    });
  });

  it('maps thread_closed with no params', () => {
    expect(activityLabelFor(event({ type: 'thread_closed' }), translateRating)).toEqual({
      key: 'activity.event.thread_closed',
      params: {},
    });
  });

  it('maps thread_reopened with no params', () => {
    expect(activityLabelFor(event({ type: 'thread_reopened' }), translateRating)).toEqual({
      key: 'activity.event.thread_reopened',
      params: {},
    });
  });

  it('maps attachment_added with the filename', () => {
    const label = activityLabelFor(
      event({ type: 'attachment_added', details: { filename: 'perizia.pdf' } }),
      translateRating,
    );
    expect(label).toEqual({
      key: 'activity.event.attachment_added',
      params: { filename: 'perizia.pdf' },
    });
  });

  it('maps calendar_assigned with the date', () => {
    const label = activityLabelFor(
      event({ type: 'calendar_assigned', details: { date: '2026-08-01' } }),
      translateRating,
    );
    expect(label).toEqual({
      key: 'activity.event.calendar_assigned',
      params: { date: '2026-08-01' },
    });
  });

  it('maps calendar_removed with no params', () => {
    expect(activityLabelFor(event({ type: 'calendar_removed' }), translateRating)).toEqual({
      key: 'activity.event.calendar_removed',
      params: {},
    });
  });

  it('maps listing_archived with no params (system-observed, actor_id null)', () => {
    const label = activityLabelFor(
      event({ type: 'listing_archived', actor_id: null, actor_username: null }),
      translateRating,
    );
    expect(label).toEqual({ key: 'activity.event.listing_archived', params: {} });
  });

  it('maps listing_reactivated with no params', () => {
    expect(activityLabelFor(event({ type: 'listing_reactivated' }), translateRating)).toEqual({
      key: 'activity.event.listing_reactivated',
      params: {},
    });
  });

  it('falls back to an empty string when a detail field is missing or not a string', () => {
    const label = activityLabelFor(
      event({ type: 'attachment_added', details: { filename: 42 } }),
      translateRating,
    );
    expect(label.params.filename).toBe('');
  });
});
