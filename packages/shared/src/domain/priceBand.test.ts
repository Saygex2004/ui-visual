import { describe, it, expect } from 'vitest';
import { priceBand } from './priceBand.js';

describe('priceBand (DOMAIN_RULES §7)', () => {
  it('boundary values', () => {
    expect(priceBand(99_999.99)).toBe('bassa');
    expect(priceBand(100_000)).toBe('media'); // lower bound inclusive
    expect(priceBand(400_000)).toBe('media'); // upper bound inclusive
    expect(priceBand(400_000.01)).toBe('alta');
  });

  it('zero is a value → Bassa (not a gap)', () => {
    expect(priceBand(0)).toBe('bassa');
  });

  it('null/undefined → Media (unknown falls in the middle band)', () => {
    expect(priceBand(null)).toBe('media');
    expect(priceBand(undefined)).toBe('media');
  });

  it('typical values', () => {
    expect(priceBand(50_000)).toBe('bassa');
    expect(priceBand(250_000)).toBe('media');
    expect(priceBand(1_000_000)).toBe('alta');
  });
});
