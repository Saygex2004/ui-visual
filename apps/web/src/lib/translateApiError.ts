// Server error keys are full dotted paths like "errors.auth.invalidCredentials"
// (API_CONTRACT.md §1: "key is a message key from the shared error
// namespace"). The `errors` i18next namespace's own JSON files are keyed
// WITHOUT that leading segment (`auth.invalidCredentials`), so the first dot
// is converted to i18next's namespace separator (`:`) before lookup —
// otherwise `{ ns: 'errors' }` plus a key that already starts with "errors."
// looks in the wrong place and silently falls through to the default.
import type { TFunction } from 'i18next';
import { ApiError } from './apiClient.js';

export function translateApiError(t: TFunction, err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  return t(err.key.replace(/^errors\./, 'errors:'), { defaultValue: fallback });
}

/** For read-path (`useQuery`) errors, which every screen previously rendered
 *  as the same static "loadError" copy regardless of cause (Phase 11
 *  hardening — offline vs. a genuine server refusal were indistinguishable
 *  to the user: `apiClient.ts`'s `handleResponse` only wraps non-2xx HTTP
 *  responses into `ApiError`, so a real network failure — `fetch()` itself
 *  rejecting — surfaces as some other, unwrapped error). `loadErrorKey` is
 *  the screen's own already-scoped key (e.g. `'area.loadError'`, looked up
 *  in the caller's own namespace via its own `t`); the offline copy always
 *  comes from the shared `errors:common.offline` key instead. */
export function translateLoadError(t: TFunction, error: unknown, loadErrorKey: string): string {
  if (error != null && !(error instanceof ApiError)) {
    return t('errors:common.offline');
  }
  return t(loadErrorKey);
}
