// Query retry policy, shared by every query in the app.
import { ApiError } from './apiClient.js';

/**
 * Never retry a 4xx. The server has answered deliberately, and asking again
 * cannot change "you may not see this" (403), "log in" (401) or "no such
 * thing" (404).
 *
 * The default policy retries three times, which turned each denied request
 * into four. With the area snapshot polling once a minute, an account without
 * that view was paying the authentication path's Firestore reads eight times
 * a minute for two views it cannot open. Retrying is for failures that might
 * pass on a second attempt — a dropped connection, a 5xx — not for an answer.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = error instanceof ApiError ? error.status : 0;
  if (status >= 400 && status < 500) return false;
  return failureCount < 3;
}
