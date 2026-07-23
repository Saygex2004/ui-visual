import { describe, it, expect } from 'vitest';
import { isPastSale } from './pastSale.js';

const TODAY = '2026-07-23';

describe('isPastSale (DOMAIN_RULES §11)', () => {
  it('past sale date → moved', () => {
    expect(isPastSale('2026-07-22', TODAY)).toBe(true);
    expect(isPastSale('2020-01-01', TODAY)).toBe(true);
  });

  it('today is NOT past (strict <)', () => {
    expect(isPastSale(TODAY, TODAY)).toBe(false);
  });

  it('future sale date → not moved', () => {
    expect(isPastSale('2026-07-24', TODAY)).toBe(false);
    expect(isPastSale('2030-01-01', TODAY)).toBe(false);
  });

  it('null data_vendita → never moved', () => {
    expect(isPastSale(null, TODAY)).toBe(false);
    expect(isPastSale(undefined, TODAY)).toBe(false);
  });
});
