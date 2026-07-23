// Smoke coverage that the API payload schemas (the client's compile-time
// contract) accept representative payloads and reject malformed ones.
import { describe, it, expect } from 'vitest';
import { ErrorEnvelopeSchema } from './api/errorEnvelope.js';
import { SendMessageRequestSchema } from './api/chat.js';
import { RandomAssignRequestSchema } from './api/calendar.js';
import { AreaSnapshotSchema } from './api/snapshot.js';

describe('API payload schemas (API_CONTRACT §§1–8)', () => {
  it('error envelope shape', () => {
    expect(() =>
      ErrorEnvelopeSchema.parse({
        error: { code: 403, key: 'errors.auth.forbidden', details: {} },
      }),
    ).not.toThrow();
  });

  it('a message must carry text, attachments, or both', () => {
    expect(() => SendMessageRequestSchema.parse({ attachment_ids: ['a'] })).not.toThrow();
    expect(() =>
      SendMessageRequestSchema.parse({ body: { type: 'doc', content: [] } }),
    ).not.toThrow();
    expect(() => SendMessageRequestSchema.parse({})).toThrow(); // neither
    expect(() => SendMessageRequestSchema.parse({ attachment_ids: [] })).toThrow();
  });

  it('random assignment count is bounded 1..200', () => {
    const base = { user_id: 'u', date: '2026-07-23' };
    expect(() => RandomAssignRequestSchema.parse({ ...base, count: 18 })).not.toThrow();
    expect(() => RandomAssignRequestSchema.parse({ ...base, count: 0 })).toThrow();
    expect(() => RandomAssignRequestSchema.parse({ ...base, count: 201 })).toThrow();
  });

  it('an empty area snapshot parses (shape contract)', () => {
    expect(() =>
      AreaSnapshotSchema.parse({
        version: 'v1',
        built_at: '2026-07-23T00:00:00.000Z',
        meta: {
          last_success_at: null,
          total_active: null,
          total_stored: null,
          detail_errors: null,
          excluded_by_rules: null,
          omi: null,
        },
        clusters: [],
        archive: [],
        omi_by_comune: {},
        blocco_index: {},
      }),
    ).not.toThrow();
  });
});
