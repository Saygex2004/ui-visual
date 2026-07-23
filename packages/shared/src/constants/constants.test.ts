import { describe, it, expect } from 'vitest';
import { REAL_ESTATE_CLUSTERS, RECOGNIZED_REGIONS, CREDITS_CLUSTERS } from './clusters.js';
import { EXCLUSION_CODES, EXCLUSION_RITO_CODES } from './exclusions.js';
import {
  CATEGORY_CATALOG,
  DEFAULT_CATEGORY_SELECTION,
  KNOWN_CATEGORY_CODES,
} from './categories.js';
import { OCCUPANCY_LABELS } from './occupancy.js';
import { AREA_SLUG_TO_SCOPE, SCOPE_TO_AREA_SLUG } from './areas.js';
import { HIGH_VALUE_THRESHOLD_EUR, EASTER_EGG_PROVINCE, EASTER_EGG_COMUNE } from './easterEggs.js';

describe('cluster taxonomy', () => {
  it('20 recognized regions across the four geolocated clusters + Black catch-all', () => {
    expect(RECOGNIZED_REGIONS).toHaveLength(20);
    expect(REAL_ESTATE_CLUSTERS).toHaveLength(5);
    expect(REAL_ESTATE_CLUSTERS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5]);
    expect(REAL_ESTATE_CLUSTERS.find((c) => c.key === 'black')?.regions).toEqual([]);
  });

  it('credits area numbers locally from 1', () => {
    expect(CREDITS_CLUSTERS.map((c) => c.number)).toEqual([1, 2]);
  });
});

describe('exclusions and categories', () => {
  it('exclusion set has 8 codes and matches its lookup', () => {
    expect(EXCLUSION_CODES).toHaveLength(8);
    expect(EXCLUSION_RITO_CODES.size).toBe(8);
    for (const { code } of EXCLUSION_CODES) expect(EXCLUSION_RITO_CODES.has(code)).toBe(true);
  });

  it('every exclusion code is present in the Appendix A catalog', () => {
    for (const { code } of EXCLUSION_CODES) expect(KNOWN_CATEGORY_CODES.has(code)).toBe(true);
  });

  it('the default selection is the 10-code base set, all known', () => {
    expect(DEFAULT_CATEGORY_SELECTION).toHaveLength(10);
    for (const code of DEFAULT_CATEGORY_SELECTION)
      expect(KNOWN_CATEGORY_CODES.has(code)).toBe(true);
  });

  it('catalog codes are unique', () => {
    const codes = CATEGORY_CATALOG.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('other product constants', () => {
  it('six occupancy labels', () => {
    expect(OCCUPANCY_LABELS).toHaveLength(6);
  });

  it('area slug ⇄ scope mapping is bijective', () => {
    expect(AREA_SLUG_TO_SCOPE.immobili).toBe('immobili');
    expect(AREA_SLUG_TO_SCOPE.crediti).toBe('corporate');
    expect(SCOPE_TO_AREA_SLUG.corporate).toBe('crediti');
    expect(SCOPE_TO_AREA_SLUG.immobili).toBe('immobili');
  });

  it('easter-egg constants (UI Appendix B)', () => {
    expect(HIGH_VALUE_THRESHOLD_EUR).toBe(5_000_000);
    expect(EASTER_EGG_PROVINCE).toBe("L'Aquila");
    expect(EASTER_EGG_COMUNE).toBe('Roccaraso');
  });
});
