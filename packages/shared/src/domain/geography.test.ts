import { describe, it, expect } from 'vitest';
import { isCapitalComune } from './geography.js';

describe('isCapitalComune', () => {
  it.each([
    ['Roma', 'Roma'],
    ['Bari', 'Bari'],
    ['Milano', 'Milano'],
    ['Napoli', 'Napoli'],
  ])('%s in provincia %s is a capital (comune === provincia)', (comune, provincia) => {
    expect(isCapitalComune({ comune, provincia })).toBe(true);
  });

  it.each([
    ['Tivoli', 'Roma'],
    ['Modugno', 'Bari'],
    ['Roccaraso', "L'Aquila"], // seed/fixtures/listings.json — also the UI Appendix B Easter egg comune
  ])('%s in provincia %s is NOT a capital (comune !== provincia)', (comune, provincia) => {
    expect(isCapitalComune({ comune, provincia })).toBe(false);
  });

  it('is false when comune is null', () => {
    expect(isCapitalComune({ comune: null, provincia: 'Roma' })).toBe(false);
  });

  it('is false when provincia is null', () => {
    expect(isCapitalComune({ comune: 'Roma', provincia: null })).toBe(false);
  });

  it('is false when both are null', () => {
    expect(isCapitalComune({ comune: null, provincia: null })).toBe(false);
  });
});
