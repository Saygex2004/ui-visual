import { describe, expect, it } from 'vitest';
import { ApiError } from './apiClient.js';
import { shouldRetry } from './retryPolicy.js';

const api = (status: number) => new ApiError(status, 'errors.x', {});

describe('shouldRetry', () => {
  it('never retries a refusal — asking again cannot change the answer', () => {
    // 403 is the expensive one: the area snapshot polls once a minute, so
    // three retries meant eight authenticated requests a minute for a view
    // the account cannot open.
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetry(0, api(status))).toBe(false);
    }
  });

  it('retries a server error, which might pass on a second attempt', () => {
    for (const status of [500, 502, 503]) {
      expect(shouldRetry(0, api(status))).toBe(true);
    }
  });

  it('retries a network failure that carries no status at all', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true);
  });

  it('gives up after three attempts, so a persistent 5xx cannot loop', () => {
    expect(shouldRetry(2, api(500))).toBe(true);
    expect(shouldRetry(3, api(500))).toBe(false);
  });
});
