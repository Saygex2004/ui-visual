// Italian number-to-words, for the written-out amounts that legal letters
// carry beside the figures. Ported from the standalone generator.
//
// Behaviour is preserved exactly, including the cents handling — see
// `importoInLettere` and its tests, which document what it currently does
// rather than what it arguably should.

const UNITA = [
  '',
  'uno',
  'due',
  'tre',
  'quattro',
  'cinque',
  'sei',
  'sette',
  'otto',
  'nove',
  'dieci',
  'undici',
  'dodici',
  'tredici',
  'quattordici',
  'quindici',
  'sedici',
  'diciassette',
  'diciotto',
  'diciannove',
];

const DECINE = [
  '',
  '',
  'venti',
  'trenta',
  'quaranta',
  'cinquanta',
  'sessanta',
  'settanta',
  'ottanta',
  'novanta',
];

/** 0–99. (Named `centinaia` in the original; it never handled hundreds.) */
function sottoCento(n: number): string {
  if (n === 0) return '';
  if (n < 20) return UNITA[n]!;
  const dec = Math.floor(n / 10);
  const unit = n % 10;
  let d = DECINE[dec]!;
  // venti/trenta/... drop their final vowel before uno and otto:
  // ventuno, ventotto — never "ventiuno".
  if (unit === 1 || unit === 8) d = d.replace(/[aeiou]$/, '');
  return d + UNITA[unit]!;
}

/** 0–999. */
function sottoMille(n: number): string {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let out = '';
  if (c === 1) out += 'cento';
  else if (c > 1) out += UNITA[c]! + 'cento';
  return out + sottoCento(resto);
}

/**
 * A whole number in Italian words: 60000 → "sessantamila".
 *
 * Documented range is 0 to 999,999,999. Above that the millions group exceeds
 * 999 and `sottoMille` cannot express it — the original carried the same
 * limit, and the amounts these letters carry are far below it.
 */
export function numeroInLettere(num: number | string): string {
  const n = typeof num === 'number' ? Math.trunc(num) : parseInt(num, 10);
  if (Number.isNaN(n) || n < 0) return '';
  if (n === 0) return 'zero';

  let out = '';
  const milioni = Math.floor(n / 1_000_000);
  const migliaia = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  if (milioni > 0) out += milioni === 1 ? 'unmilione' : sottoMille(milioni) + 'milioni';
  if (migliaia > 0) out += migliaia === 1 ? 'mille' : sottoMille(migliaia) + 'mila';
  if (resto > 0) out += sottoMille(resto);

  return out;
}

/**
 * The amount as written into the letter: "sessantamila/00", and with cents,
 * "milleduecentotrentaquattro/56".
 *
 * The words carry the whole euros and the two digits after the slash carry
 * the cents — the form used on Italian instruments, where the written amount
 * exists precisely so a figure cannot be altered.
 *
 * Fixed 2026-08-27. The ported version appended the cents to the integer's
 * WORDS and still ended in "/00", so 1234.56 read
 * "milleduecentotrentaquattrocinquantasei/00" — which reads as 123456 euros,
 * a hundredfold error in a signed document. Whole amounts, which is what
 * these letters normally carry, were unaffected and are unchanged.
 *
 * Cents are the unit of arithmetic here rather than a subtraction from the
 * float, so a value like 1234.999 rounds up into the euros (1235/00) instead
 * of producing an impossible "/100".
 */
export function importoInLettere(num: number | string | null | undefined): string {
  if (!num && num !== 0) return '';
  const val = parseFloat(String(num).replace(',', '.'));
  if (Number.isNaN(val) || val < 0) return '';

  const centesimi = Math.round(val * 100);
  const euro = Math.floor(centesimi / 100);
  const resto = centesimi % 100;

  return `${numeroInLettere(euro)}/${String(resto).padStart(2, '0')}`;
}
