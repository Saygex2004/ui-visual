import { describe, expect, it } from 'vitest';
import type { Pratica } from '@pvp/shared';
import {
  CSV_HEADERS,
  EMPTY_FILTERS,
  csvFilename,
  filterPratiche,
  praticheToCsv,
  veicoliPresenti,
} from './praticheData.js';

function pratica(over: Partial<Pratica> = {}): Pratica {
  return {
    id: 'p1',
    ndg: '900123',
    numero_pratica: '163354',
    veicolo: 'Augusto',
    estinto: false,
    n_scatola: 3,
    plurima_riscontro: 'Augusto',
    note: null,
    ordinato_da: null,
    created_at: '2026-08-24T10:00:00.000Z',
    created_by: 'u1',
    updated_at: null,
    updated_by: null,
    ...over,
  };
}

describe('filterPratiche', () => {
  it('returns everything when no filter is set', () => {
    const all = [pratica(), pratica({ id: 'p2', veicolo: 'Diocleziano' })];
    expect(filterPratiche(all, EMPTY_FILTERS)).toHaveLength(2);
  });

  it('matches free text across NDG, numero, veicolo, note and box number', () => {
    const all = [
      // 'a' needs its own numero_pratica: the factory default is 163354, and
      // leaving it would make the 163354 case match two rows and prove nothing.
      pratica({ id: 'a', ndg: '900123', numero_pratica: '000001' }),
      pratica({ id: 'b', ndg: '111', numero_pratica: '163354' }),
      pratica({ id: 'c', ndg: '222', numero_pratica: '999', note: 'Rinnovo ipoteca' }),
      pratica({ id: 'd', ndg: '333', numero_pratica: '888', n_scatola: 42, note: null }),
    ];
    const ids = (q: string) => filterPratiche(all, { ...EMPTY_FILTERS, q }).map((p) => p.id);
    expect(ids('900123')).toEqual(['a']);
    expect(ids('163354')).toEqual(['b']);
    expect(ids('ipoteca')).toEqual(['c']);
    expect(ids('42')).toEqual(['d']); // the box number is searchable, not just displayed
  });

  it('is case-insensitive and ignores surrounding whitespace', () => {
    const all = [pratica({ note: 'Rinnovo Ipoteca' })];
    expect(filterPratiche(all, { ...EMPTY_FILTERS, q: '  rinnovo  ' })).toHaveLength(1);
    expect(filterPratiche(all, { ...EMPTY_FILTERS, q: '  RINNOVO' })).toHaveLength(1);
    // Negative control: without this the two assertions above would also pass
    // if the filter simply ignored `q` altogether.
    expect(filterPratiche(all, { ...EMPTY_FILTERS, q: 'usufrutto' })).toHaveLength(0);
  });

  it('searches the ordering account by name, not by its opaque id', () => {
    const all = [pratica({ ordinato_da: 'u7' })];
    const nome = (id: string | null) => (id === 'u7' ? 'rossi' : '');
    expect(filterPratiche(all, { ...EMPTY_FILTERS, q: 'rossi' }, nome)).toHaveLength(1);
    expect(filterPratiche(all, { ...EMPTY_FILTERS, q: 'u7' }, nome)).toHaveLength(0);
  });

  it('filters by vehicle exactly, and treats a missing vehicle as not matching', () => {
    const all = [
      pratica({ id: 'a', veicolo: 'Augusto' }),
      pratica({ id: 'b', veicolo: 'Diocleziano' }),
      pratica({ id: 'c', veicolo: null }),
    ];
    expect(filterPratiche(all, { ...EMPTY_FILTERS, veicolo: 'Augusto' }).map((p) => p.id)).toEqual([
      'a',
    ]);
  });

  it('filters by extinguished state in both directions', () => {
    const all = [pratica({ id: 'a', estinto: true }), pratica({ id: 'b', estinto: false })];
    expect(filterPratiche(all, { ...EMPTY_FILTERS, estinto: 'si' }).map((p) => p.id)).toEqual([
      'a',
    ]);
    expect(filterPratiche(all, { ...EMPTY_FILTERS, estinto: 'no' }).map((p) => p.id)).toEqual([
      'b',
    ]);
    expect(filterPratiche(all, { ...EMPTY_FILTERS, estinto: 'tutte' })).toHaveLength(2);
  });

  it('combines filters conjunctively', () => {
    const all = [
      pratica({ id: 'a', veicolo: 'Augusto', estinto: true, ndg: 'X1' }),
      pratica({ id: 'b', veicolo: 'Augusto', estinto: false, ndg: 'X1' }),
    ];
    const got = filterPratiche(all, { q: 'X1', veicolo: 'Augusto', estinto: 'si' });
    expect(got.map((p) => p.id)).toEqual(['a']);
  });
});

describe('veicoliPresenti', () => {
  it('lists distinct vehicles alphabetically, dropping empties', () => {
    const all = [
      pratica({ veicolo: 'Diocleziano' }),
      pratica({ veicolo: 'Augusto' }),
      pratica({ veicolo: 'Augusto' }),
      pratica({ veicolo: null }),
    ];
    expect(veicoliPresenti(all)).toEqual(['Augusto', 'Diocleziano']);
  });
});

describe('praticheToCsv', () => {
  it('starts with a UTF-8 BOM so Excel does not mangle accents', () => {
    expect(praticheToCsv([pratica()]).charCodeAt(0)).toBe(0xfeff);
  });

  it('separates with semicolons — a comma puts an Italian Excel row in one cell', () => {
    const csv = praticheToCsv([pratica()]);
    expect(csv.split('\r\n')[0]).toBe(`\uFEFF${CSV_HEADERS.join(';')}`);
  });

  it('writes the extinguished flag as Sì/No, not true/false', () => {
    expect(praticheToCsv([pratica({ estinto: true })])).toContain(';Sì;');
    expect(praticheToCsv([pratica({ estinto: false })])).toContain(';No;');
  });

  it('quotes a field containing the separator, so it stays one cell', () => {
    const csv = praticheToCsv([pratica({ note: 'Corrispondenza; poi rinnovo' })]);
    expect(csv).toContain('"Corrispondenza; poi rinnovo"');
  });

  it('doubles embedded quotes rather than truncating the field', () => {
    const csv = praticheToCsv([pratica({ note: 'nota "importante"' })]);
    expect(csv).toContain('"nota ""importante"""');
  });

  it('neutralizes a leading = so Excel keeps it as text, not a formula', () => {
    const csv = praticheToCsv([pratica({ ndg: '=1+1' })]);
    expect(csv).toContain("'=1+1");
  });

  it('exports exactly the filtered rows — export and table cannot diverge', () => {
    const all = [pratica({ id: 'a', ndg: 'KEEP' }), pratica({ id: 'b', ndg: 'DROP' })];
    const shown = filterPratiche(all, { ...EMPTY_FILTERS, q: 'keep' });
    const csv = praticheToCsv(shown);
    expect(csv).toContain('KEEP');
    expect(csv).not.toContain('DROP');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(2); // header + one row
  });

  it('renders the ordering account by name', () => {
    const csv = praticheToCsv([pratica({ ordinato_da: 'u7' })], () => 'rossi');
    expect(csv).toContain(';rossi;');
  });

  it('leaves an absent box number empty rather than writing 0 or null', () => {
    const csv = praticheToCsv([pratica({ n_scatola: null })]);
    expect(csv).not.toContain('null');
    expect(csv).not.toContain(';0;');
  });
});

describe('csvFilename', () => {
  it('dates the file so successive exports do not overwrite each other', () => {
    expect(csvFilename(new Date('2026-08-24T15:00:00Z'))).toBe('pratiche-2026-08-24.csv');
  });
});
