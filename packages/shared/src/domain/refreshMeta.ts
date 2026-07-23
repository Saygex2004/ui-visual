// Refresh-metadata mapping (DOMAIN_RULES.md §10 / UI §10.1). The one place
// header figures come from mixed sources — fixed here so no implementer
// re-derives it differently. `excluded_by_rules` is COMPUTED by the snapshot
// builder (count of active immobili excluded per §5), not a `meta` field, and
// distinct from the scraper's `excluded_by_selection`. Absent `meta` ⇒ the
// never-fetched fallback (nulls).
import type { Scope } from '../constants/areas.js';

export interface ScopeMetaInput {
  last_success_at: string;
  total_active: number;
  total_stored: number;
  detail_errors: number;
}

export interface OmiMetaInput {
  fetched_at: string;
  semestre: string;
}

export interface RefreshMetadata {
  last_success_at: string | null;
  total_active: number | null;
  total_stored: number | null;
  detail_errors: number | null;
  excluded_by_rules: number | null; // immobili only
  omi: { fetched_at: string; semestre: string } | null; // immobili only
}

export function mapRefreshMetadata(input: {
  scope: Scope;
  meta: ScopeMetaInput | null | undefined;
  omiMeta?: OmiMetaInput | null;
  excludedByRules?: number | null;
}): RefreshMetadata {
  const { scope, meta, omiMeta, excludedByRules } = input;
  const isImmobili = scope === 'immobili';

  if (meta == null) {
    // Never-fetched fallback.
    return {
      last_success_at: null,
      total_active: null,
      total_stored: null,
      detail_errors: null,
      excluded_by_rules: isImmobili ? (excludedByRules ?? null) : null,
      omi: isImmobili ? (omiMeta ?? null) : null,
    };
  }

  return {
    last_success_at: meta.last_success_at,
    total_active: meta.total_active,
    total_stored: meta.total_stored,
    detail_errors: meta.detail_errors,
    excluded_by_rules: isImmobili ? (excludedByRules ?? null) : null,
    omi: isImmobili ? (omiMeta ?? null) : null,
  };
}
