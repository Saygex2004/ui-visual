import { describe, it, expect } from 'vitest';
import { mapRefreshMetadata } from './refreshMeta.js';

const scopeMeta = {
  last_success_at: '2026-07-01T06:00:00.000Z',
  total_active: 30,
  total_stored: 27,
  detail_errors: 2,
};
const omiMeta = { fetched_at: '2026-06-30T12:00:00.000Z', semestre: '20252' };

describe('mapRefreshMetadata (DOMAIN_RULES §10)', () => {
  it('maps the header figures to their sources (immobili)', () => {
    const out = mapRefreshMetadata({
      scope: 'immobili',
      meta: scopeMeta,
      omiMeta,
      excludedByRules: 8,
    });
    expect(out.last_success_at).toBe(scopeMeta.last_success_at);
    expect(out.total_active).toBe(30); // "total found"
    expect(out.total_stored).toBe(27); // "analyzed"
    expect(out.excluded_by_rules).toBe(8); // computed, immobili only
    expect(out.omi).toEqual(omiMeta);
  });

  it('corporate carries no excluded_by_rules and no omi', () => {
    const out = mapRefreshMetadata({
      scope: 'corporate',
      meta: scopeMeta,
      omiMeta,
      excludedByRules: 8,
    });
    expect(out.excluded_by_rules).toBeNull();
    expect(out.omi).toBeNull();
  });

  it('absent meta → never-fetched fallback (nulls)', () => {
    const out = mapRefreshMetadata({ scope: 'immobili', meta: null, excludedByRules: 5 });
    expect(out.last_success_at).toBeNull();
    expect(out.total_active).toBeNull();
    expect(out.total_stored).toBeNull();
    expect(out.detail_errors).toBeNull();
    // the computed excluded count is still available even before first fetch
    expect(out.excluded_by_rules).toBe(5);
  });
});
