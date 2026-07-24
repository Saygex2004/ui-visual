import { describe, it, expect } from 'vitest';
import { generateSessionToken, hashSessionToken } from './sessionToken.js';

describe('session tokens (DATA_MODEL.md §9)', () => {
  it('generates unique, sufficiently long random tokens', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32); // 256 bits, base64url
  });

  it('hashing is deterministic and one-way-looking (hash != token)', () => {
    const token = generateSessionToken();
    const h1 = hashSessionToken(token);
    const h2 = hashSessionToken(token);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(token);
    expect(h1).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it('different tokens hash to different values', () => {
    const h1 = hashSessionToken(generateSessionToken());
    const h2 = hashSessionToken(generateSessionToken());
    expect(h1).not.toBe(h2);
  });
});
