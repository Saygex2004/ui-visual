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

  it('puts the cents after the slash, not into the words', () => {
    // The defect this replaced: the cents were appended to the integer's
    // words and the suffix stayed "/00", so this amount read as 123456 euros
    // — a hundredfold error on a signed instrument.
    expect(importoInLettere(1234.56)).toBe('milleduecentotrentaquattro/56');
    expect(importoInLettere('1234,56')).toBe('milleduecentotrentaquattro/56');
  });

  it('pads a single-digit cent, so /5 never appears', () => {
    expect(importoInLettere(10.05)).toBe('dieci/05');
    expect(importoInLettere(10.5)).toBe('dieci/50');
  });

  it('carries into the euros rather than writing an impossible /100', () => {
    expect(importoInLettere(1234.999)).toBe('milleduecentotrentacinque/00');
    expect(importoInLettere(0.999)).toBe('uno/00');
  });

  it('leaves whole amounts exactly as before — the common case', () => {
    expect(importoInLettere(60000)).toBe('sessantamila/00');
    expect(importoInLettere(0)).toBe('zero/00');
  });
});
