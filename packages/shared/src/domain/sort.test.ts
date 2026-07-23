import { describe, it, expect } from 'vitest';
import { compareValore, compareData, compareBloccoKey } from './sort.js';

describe('compareValore (nulls lowest, UI §4.2)', () => {
  it('orders numerically, nulls first ascending', () => {
    const rows = [300, null, 100, 200, null];
    const sorted = [...rows].sort(compareValore);
    expect(sorted).toEqual([null, null, 100, 200, 300]);
  });

  it('null equals null; number beats null', () => {
    expect(compareValore(null, null)).toBe(0);
    expect(compareValore(null, 0)).toBeLessThan(0);
    expect(compareValore(0, null)).toBeGreaterThan(0);
  });
});

describe('compareData (chronological with nulls, UI §4.2)', () => {
  it('sorts YYYY-MM-DD chronologically, nulls first', () => {
    const rows = ['2026-03-01', null, '2025-12-31', '2026-01-01'];
    const sorted = [...rows].sort(compareData);
    expect(sorted).toEqual([null, '2025-12-31', '2026-01-01', '2026-03-01']);
  });
});

describe('compareBloccoKey (identity adjacency, UI §4.2)', () => {
  it('brings equal keys adjacent; ungrouped (null) sort last', () => {
    const rows = ['B', null, 'A', 'B', null, 'A'];
    const sorted = [...rows].sort(compareBloccoKey);
    expect(sorted).toEqual(['A', 'A', 'B', 'B', null, null]);
  });
});
