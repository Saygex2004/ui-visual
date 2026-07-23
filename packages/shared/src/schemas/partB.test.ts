import { describe, it, expect } from 'vitest';
import { UserSchema } from './partB/accounts.js';
import { RatingSchema } from './partB/ratings.js';
import { CalendarDaySchema, AssignmentIndexEntrySchema } from './partB/calendar.js';
import { ActivityEventSchema } from './partB/activity.js';
import {
  ChatThreadSchema,
  ChatMessageSchema,
  ReadStateSchema,
  UserCountersSchema,
} from './partB/chat.js';
import { AttachmentSchema } from './partB/attachments.js';
import { AdminEventSchema } from './partB/adminEvents.js';
import { loadFixture } from '../__fixtures__/load.js';

describe('Part B schemas round-trip (DATA_MODEL §§9–15)', () => {
  it('users', () => {
    for (const u of loadFixture<unknown[]>('users.json')) {
      expect(() => UserSchema.parse(u)).not.toThrow();
    }
  });

  it('ratings (closed rating vocabulary)', () => {
    for (const r of loadFixture<unknown[]>('ratings.json')) {
      expect(() => RatingSchema.parse(r)).not.toThrow();
    }
  });

  it('calendar_days and assignment_index (incl. null + set completed_at)', () => {
    for (const d of loadFixture<unknown[]>('calendar_days.json')) {
      expect(() => CalendarDaySchema.parse(d)).not.toThrow();
    }
    const entries = loadFixture<unknown[]>('assignment_index.json').map((e) =>
      AssignmentIndexEntrySchema.parse(e),
    );
    expect(entries.some((e) => e.completed_at !== null)).toBe(true); // completion permanent
    expect(entries.some((e) => e.completed_at === null)).toBe(true);
  });

  it('listing_activity (closed §12 vocabulary; system events have null actor)', () => {
    const events = loadFixture<unknown[]>('listing_activity.json').map((e) =>
      ActivityEventSchema.parse(e),
    );
    expect(events.some((e) => e.actor_id === null && e.type === 'listing_archived')).toBe(true);
  });

  it('chat threads, messages (rich-text + attachment-only), reads, counters', () => {
    const threads =
      loadFixture<Array<{ messages: unknown[]; reads: unknown[] } & Record<string, unknown>>>(
        'chat_threads.json',
      );
    for (const { messages, reads, ...thread } of threads) {
      expect(() => ChatThreadSchema.parse(thread)).not.toThrow();
      for (const m of messages) expect(() => ChatMessageSchema.parse(m)).not.toThrow();
      for (const r of reads) expect(() => ReadStateSchema.parse(r)).not.toThrow();
    }
    // A rich-text body and an attachment-only (null body) message both exist.
    const allMessages = threads.flatMap((t) => t.messages).map((m) => ChatMessageSchema.parse(m));
    expect(allMessages.some((m) => m.body !== null)).toBe(true);
    expect(allMessages.some((m) => m.body === null && m.attachment_ids.length > 0)).toBe(true);

    for (const c of loadFixture<unknown[]>('user_counters.json')) {
      expect(() => UserCountersSchema.parse(c)).not.toThrow();
    }
  });

  it('attachments', () => {
    for (const a of loadFixture<unknown[]>('attachments.json')) {
      expect(() => AttachmentSchema.parse(a)).not.toThrow();
    }
  });

  it('admin_events (closed §15 vocabulary)', () => {
    for (const e of loadFixture<unknown[]>('admin_events.json')) {
      expect(() => AdminEventSchema.parse(e)).not.toThrow();
    }
  });
});
