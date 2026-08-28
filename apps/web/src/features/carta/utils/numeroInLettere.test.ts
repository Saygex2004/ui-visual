// These amounts end up written into signed legal letters, so the cases below
// are the ones a reader would notice: the elisions Italian requires, the
// singular forms, and the cents behaviour as it actually is.
import { describe, expect, it } from 'vitest';
import { importoInLettere, numeroInLettere } from './numeroInLettere.js';

describe('numeroInLettere', () => {
  it('writes the small numbers', () => {
    expect(numeroInLettere(0)).toBe('zero');
    expect(numeroInLettere(7)).toBe('sette');
    expect(numeroInLettere(19)).toBe('diciannove');
  });

  it('elides the tens before uno and otto, as Italian requires', () => {
    // "ventiuno" would be wrong in a document someone signs.
    expect(numeroInLettere(21)).toBe('ventuno');
    expect(numeroInLettere(28)).toBe('ventotto');
    expect(numeroInLettere(31)).toBe('trentuno');
    expect(numeroInLettere(98)).toBe('novantotto');
    // and does NOT elide elsewhere
    expect(numeroInLettere(22)).toBe('ventidue');
  });

  it('uses the singular forms: cento, mille, unmilione', () => {
    expect(numeroInLettere(100)).toBe('cento');
    expect(numeroInLettere(1000)).toBe('mille');
    expect(numeroInLettere(1_000_000)).toBe('unmilione');
    // and the plurals where they belong
    expect(numeroInLettere(200)).toBe('duecento');
    expect(numeroInLettere(2000)).toBe('duemila');
    expect(numeroInLettere(2_000_000)).toBe('duemilioni');
  });

  it('handles the amounts these letters actually carry', () => {
    expect(numeroInLettere(60000)).toBe('sessantamila');
    expect(numeroInLettere(1234)).toBe('milleduecentotrentaquattro');
    expect(numeroInLettere(163354)).toBe('centosessantatremilatrecentocinquantaquattro');
  });

  it('joins the groups without losing a middle one', () => {
    // 1,001,000 must not collapse to "unmilione".
    expect(numeroInLettere(1_001_000)).toBe('unmilionemille');
    expect(numeroInLettere(1_000_001)).toBe('unmilioneuno');
  });

  it('refuses what it cannot represent, instead of guessing', () => {
    expect(numeroInLettere(-1)).toBe('');
    expect(numeroInLettere('abc')).toBe('');
  });

  it('truncates a decimal rather than rounding it up', () => {
    expect(numeroInLettere(99.9)).toBe('novantanove');
  });
});

describe('importoInLettere', () => {
  it('writes a whole amount with the /00 suffix', () => {
    expect(importoInLettere(60000)).toBe('sessantamila/00');
    expect(importoInLettere(0)).toBe('zero/00');
  });

  it('accepts the Italian decimal comma as typed', () => {
    expect(importoInLettere('1234,00')).toBe('milleduecentotrentaquattro/00');
  });

  it('leaves an empty input empty rather than writing "zero"', () => {
    expect(importoInLettere('')).toBe('');
    expect(importoInLettere(null)).toBe('');
    expect(importoInLettere(undefined)).toBe('');
  });

  // Documents the CURRENT behaviour, which is almost certainly not intended:
  // the cents are appended to the integer words and the suffix stays "/00",
  // so the amount reads as a different, much larger number. Pinned here so a
  // future fix is a deliberate change with a visible diff, not a surprise.
  it('appends cents to the words and still ends in /00 (known oddity)', () => {
    expect(importoInLettere(1234.56)).toBe('milleduecentotrentaquattrocinquantasei/00');
  });
});
