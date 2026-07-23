// Round-trips EVERY collection fixture file through its schema — the dataset is
// itself under test (Phase 1 verification; TESTING §2 "every Part A fixture
// parses; every Part B schema round-trips").
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as S from './index.js';
import { loadFixture } from '../__fixtures__/load.js';

// Array-shaped collections: file → element schema.
const ARRAY_COLLECTIONS: Array<[string, z.ZodType]> = [
  ['listings.json', S.ListingSchema],
  ['omi_prices.json', S.OmiPriceSchema],
  ['runs.json', S.RunSchema],
  ['users.json', S.UserSchema],
  ['ratings.json', S.RatingSchema],
  ['calendar_days.json', S.CalendarDaySchema],
  ['assignment_index.json', S.AssignmentIndexEntrySchema],
  ['listing_activity.json', S.ActivityEventSchema],
  ['attachments.json', S.AttachmentSchema],
  ['user_counters.json', S.UserCountersSchema],
  ['admin_events.json', S.AdminEventSchema],
];

describe('fixture dataset round-trips through its schemas', () => {
  it.each(ARRAY_COLLECTIONS)('%s', (file, schema) => {
    const rows = loadFixture<unknown[]>(file);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(() => schema.parse(row)).not.toThrow();
  });

  it('meta.json (three well-known documents)', () => {
    const meta = loadFixture<Record<string, unknown>>('meta.json');
    expect(() => S.ScopeMetaSchema.parse(meta.immobili)).not.toThrow();
    expect(() => S.ScopeMetaSchema.parse(meta.corporate)).not.toThrow();
    expect(() => S.OmiMetaSchema.parse(meta.omi)).not.toThrow();
  });

  it('settings.json (extraction_categories)', () => {
    const settings = loadFixture<{ extraction_categories: unknown }>('settings.json');
    expect(() => S.ExtractionCategoriesSchema.parse(settings.extraction_categories)).not.toThrow();
  });

  it('chat_threads.json (thread + nested messages + reads)', () => {
    const threads =
      loadFixture<Array<{ messages: unknown[]; reads: unknown[] } & Record<string, unknown>>>(
        'chat_threads.json',
      );
    for (const { messages, reads, ...thread } of threads) {
      expect(() => S.ChatThreadSchema.parse(thread)).not.toThrow();
      for (const m of messages) expect(() => S.ChatMessageSchema.parse(m)).not.toThrow();
      for (const r of reads) expect(() => S.ReadStateSchema.parse(r)).not.toThrow();
    }
  });
});
