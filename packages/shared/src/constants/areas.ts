// Areas and the slug ⇄ scope mapping (DOMAIN_RULES.md §1, FRONTEND.md §2).
// Area slugs are the user-visible URL segments (Italian); the API/storage keeps
// the raw scopes. The mapping lives here so neither app re-derives it.

/** Storage/scraper scope, stored verbatim on each listing (`scope` field). */
export type Scope = 'immobili' | 'corporate';

/** User-visible area slug used in URLs. */
export type AreaSlug = 'immobili' | 'crediti';

export const SCOPES: readonly Scope[] = ['immobili', 'corporate'] as const;
export const AREA_SLUGS: readonly AreaSlug[] = ['immobili', 'crediti'] as const;

export const AREA_SLUG_TO_SCOPE: Readonly<Record<AreaSlug, Scope>> = {
  immobili: 'immobili',
  crediti: 'corporate',
};

export const SCOPE_TO_AREA_SLUG: Readonly<Record<Scope, AreaSlug>> = {
  immobili: 'immobili',
  corporate: 'crediti',
};

export function scopeForAreaSlug(slug: AreaSlug): Scope {
  return AREA_SLUG_TO_SCOPE[slug];
}

export function areaSlugForScope(scope: Scope): AreaSlug {
  return SCOPE_TO_AREA_SLUG[scope];
}
