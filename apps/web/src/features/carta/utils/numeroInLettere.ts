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
 * The amount as it is written into the letter: "sessantamila/00".
 *
 * NOTE — cents are handled oddly and this port keeps the behaviour rather than
 * silently changing what appears in a signed document: a value with cents has
 * them appended as words to the integer part and STILL ends in "/00", so
 * 1234.56 reads "milleduecentotrentaquattrocinquantasei/00". The conventional
 * form would be "milleduecentotrentaquattro/56". Flagged for the owner to
 * decide; changing it alters legal output and is not a silent fix.
 */
export function importoInLettere(num: number | string | null | undefined): string {
  if (!num && num !== 0) return '';
  const val = parseFloat(String(num).replace(',', '.'));
  if (Number.isNaN(val) || val < 0) return '';

  const intero = Math.floor(val);
  const decimali = Math.round((val - intero) * 100);

  let out = numeroInLettere(intero);
  if (decimali > 0) out += sottoCento(decimali);
  return out + '/00';
}
