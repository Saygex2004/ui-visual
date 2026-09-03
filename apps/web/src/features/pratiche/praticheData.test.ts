import { describe, expect, it } from 'vitest';
import type { Pratica } from '@pvp/shared';
import {
  EMPTY_FILTERS,
  filterPratiche,
  formatEuro,
  inRitardo,
  parseEuro,
  portafogliPresenti,
  mesiPresenti,
  etichettaMese,
} from './praticheData.js';

function pratica(over: Partial<Pratica> = {}): Pratica {
  return {
    id: 'p1',
    ndg: ['900123'],
    numero_pratica: '163354',
    portafoglio: 'Augusto',
    stato: 'richiesto',
    n_scatole: '3',
    note: null,
    ordinato_da: null,
    slack_tag_user_ids: [],
    data_richiesta: null,
    data_spedizione: null,
    data_consegna_prevista: null,
    data_consegna_effettiva: null,
    costo_spedizione_cent: null,
    created_at: '2026-08-24T10:00:00.000Z',
    created_by: 'u1',
    updated_at: null,
    updated_by: null,
    ...over,
  };
}

describe('money', () => {
  it('round-trips euros through cents', () => {
    expect(parseEuro('12,50')).toBe(1250);
    expect(formatEuro(1250)).toBe('12,50');
    expect(parseEuro('177')).toBe(17700);
    expect(formatEuro(17700)).toBe('177,00');
  });

  it('totals exactly — the reason cents are stored instead of euros', () => {
    // 12.50 + 177.00 in floats can land at 189.50000000000003; in cents it
    // cannot, and this column exists to be compared and summed.
    const total = parseEuro('12,50')! + parseEuro('177,00')!;
    expect(total).toBe(18950);
    expect(formatEuro(total)).toBe('189,50');
  });

  it('accepts a dot as well as a comma, and a euro sign', () => {
    // A numeric keypad gives a dot, prose gives a comma; refusing either
    // would just look broken to the person typing.
    expect(parseEuro('12.50')).toBe(1250);
    expect(parseEuro('€ 12,50')).toBe(1250);
  });

  it('treats an empty or nonsense amount as absent, never as zero', () => {
    expect(parseEuro('')).toBeNull();
    expect(parseEuro('   ')).toBeNull();
    expect(parseEuro('abc')).toBeNull();
    expect(parseEuro('-5')).toBeNull();
    expect(formatEuro(null)).toBe('');
  });

  it('always shows two decimals', () => {
    expect(formatEuro(1200)).toBe('12,00');
    expect(formatEuro(5)).toBe('0,05');
  });
});

describe('inRitardo', () => {
  const oggi = '2026-08-24';

  it('is late when the expected date has passed and nothing arrived', () => {
    expect(inRitardo(pratica({ data_consegna_prevista: '2026-08-21' }), oggi)).toBe(true);
  });

  it('is not late once it actually arrived, however late that was', () => {
    expect(
      inRitardo(
        pratica({ data_consegna_prevista: '2026-08-21', data_consegna_effettiva: '2026-08-25' }),
        oggi,
      ),
    ).toBe(false);
  });

  it('is not late on the expected day itself, nor before it', () => {
    expect(inRitardo(pratica({ data_consegna_prevista: oggi }), oggi)).toBe(false);
    expect(inRitardo(pratica({ data_consegna_prevista: '2026-08-25' }), oggi)).toBe(false);
  });

  it('is not late when no delivery was ever expected', () => {
    expect(inRitardo(pratica({ data_consegna_prevista: null }), oggi)).toBe(false);
  });
});

describe('filterPratiche', () => {
  it('returns everything when no filter is set', () => {
    const all = [pratica(), pratica({ id: 'p2', portafoglio: 'Diocleziano' })];
    expect(filterPratiche(all, EMPTY_FILTERS)).toHaveLength(2);
  });

  it('matches free text across NDG, numero, portafoglio, note and boxes', () => {
    const all = [
      // 'a' needs its own numero_pratica: the factory default is 163354, and
      // leaving it would make the 163354 case match two rows and prove nothing.
      pratica({ id: 'a', ndg: ['900123'], numero_pratica: '000001' }),
      pratica({ id: 'b', ndg: ['111'], numero_pratica: '163354' }),
      pratica({ id: 'c', ndg: ['222'], numero_pratica: '999', note: 'Rinnovo ipoteca' }),
      pratica({ id: 'd', ndg: ['333'], numero_pratica: '888', n_scatole: '42', note: null }),
    ];
    const ids = (q: string) => filterPratiche(all, { ...EMPTY_FILTERS, q }).map((p) => p.id);
    expect(ids('900123')).toEqual(['a']);
    expect(ids('163354')).toEqual(['b']);
    expect(ids('ipoteca')).toEqual(['c']);
    expect(ids('42')).toEqual(['d']); // the boxes are searchable, not just displayed
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

  it('filters by portfolio exactly', () => {
    const all = [
      pratica({ id: 'a', portafoglio: 'Augusto' }),
      pratica({ id: 'b', portafoglio: 'Diocleziano' }),
      pratica({ id: 'c', portafoglio: null }),
    ];
    expect(
      filterPratiche(all, { ...EMPTY_FILTERS, portafoglio: 'Augusto' }).map((p) => p.id),
    ).toEqual(['a']);
  });

  it('filters by stage', () => {
    const all = [
      pratica({ id: 'a', stato: 'spedito' }),
      pratica({ id: 'b', stato: 'consegnato' }),
      pratica({ id: 'c', stato: 'richiesto' }),
    ];
    expect(filterPratiche(all, { ...EMPTY_FILTERS, stato: 'spedito' }).map((p) => p.id)).toEqual([
      'a',
    ]);
    expect(filterPratiche(all, { ...EMPTY_FILTERS, stato: '' })).toHaveLength(3);
  });

  it('combines filters conjunctively', () => {
    const all = [
      pratica({ id: 'a', portafoglio: 'Augusto', stato: 'spedito', ndg: ['X1'] }),
      pratica({ id: 'b', portafoglio: 'Augusto', stato: 'richiesto', ndg: ['X1'] }),
    ];
    const got = filterPratiche(all, {
      ...EMPTY_FILTERS,
      q: 'X1',
      portafoglio: 'Augusto',
      stato: 'spedito',
    });
    expect(got.map((p) => p.id)).toEqual(['a']);
  });
});

describe('portafogliPresenti', () => {
  it('lists distinct portfolios alphabetically, dropping empties', () => {
    const all = [
      pratica({ portafoglio: 'Diocleziano' }),
      pratica({ portafoglio: 'Augusto' }),
      pratica({ portafoglio: 'Augusto' }),
      pratica({ portafoglio: null }),
    ];
    expect(portafogliPresenti(all)).toEqual(['Augusto', 'Diocleziano']);
  });
});

describe('filtro per mese', () => {
  const marzo = pratica({ id: 'a', data_richiesta: '2026-03-04', data_spedizione: '2026-04-01' });
  const aprile = pratica({ id: 'b', data_richiesta: '2026-04-28', data_spedizione: null });
  const senzaData = pratica({ id: 'c', data_richiesta: null });
  const tutte = [marzo, aprile, senzaData];

  it('keeps only the pratiche whose chosen date falls in that month', () => {
    const res = filterPratiche(tutte, {
      ...EMPTY_FILTERS,
      campoData: 'data_richiesta',
      mese: '2026-03',
    });
    expect(res.map((p) => p.id)).toEqual(['a']);
  });

  it('asks the month of the date the user picked, not always the same one', () => {
    // The same pratica is a March one by request and an April one by
    // shipping: "what happened in March" is a different set depending on
    // which date you mean, which is why the field is a choice.
    const perSpedizione = filterPratiche(tutte, {
      ...EMPTY_FILTERS,
      campoData: 'data_spedizione',
      mese: '2026-04',
    });
    expect(perSpedizione.map((p) => p.id)).toEqual(['a']);
  });

  it('drops a pratica missing that date rather than counting it in', () => {
    const res = filterPratiche(tutte, {
      ...EMPTY_FILTERS,
      campoData: 'data_spedizione',
      mese: '2026-03',
    });
    expect(res).toEqual([]);
  });

  it('leaves everything alone when no month is chosen', () => {
    expect(filterPratiche(tutte, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('combines with the other filters rather than replacing them', () => {
    const res = filterPratiche(
      [marzo, pratica({ id: 'd', data_richiesta: '2026-03-09', portafoglio: 'Diocleziano' })],
      { ...EMPTY_FILTERS, campoData: 'data_richiesta', mese: '2026-03', portafoglio: 'Augusto' },
    );
    expect(res.map((p) => p.id)).toEqual(['a']);
  });
});

describe('mesiPresenti', () => {
  it('lists the months actually present, newest first and without repeats', () => {
    // Only months with something in them: offering an empty month invites the
    // conclusion that something was lost.
    const dati = [
      pratica({ id: 'a', data_richiesta: '2026-03-04' }),
      pratica({ id: 'b', data_richiesta: '2026-03-28' }),
      pratica({ id: 'c', data_richiesta: '2026-01-02' }),
      pratica({ id: 'd', data_richiesta: null }),
    ];
    expect(mesiPresenti(dati, 'data_richiesta')).toEqual(['2026-03', '2026-01']);
    expect(mesiPresenti(dati, 'data_spedizione')).toEqual([]);
  });
});

describe('etichettaMese', () => {
  it('reads as a month, in Italian', () => {
    expect(etichettaMese('2026-03')).toBe('marzo 2026');
  });

  it('does not slip to the month before in a negative time zone', () => {
    // 'YYYY-MM' alone parses as UTC midnight, which is the previous month
    // west of Greenwich; building from the first of the month avoids it.
    expect(etichettaMese('2026-01')).toBe('gennaio 2026');
  });
});
