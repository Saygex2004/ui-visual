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
