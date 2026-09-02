import { describe, it, expect } from 'vitest';
import {
  famigliaProceduraListing,
  tribunaleKey,
  proceduraMatchKey,
  proceduraDocKey,
  selectProceduraConcorsuale,
  hasProceduraConcorsuale,
  PROCEDURA_TRIBUNALE_OVERRIDES,
  type ProceduraConcorsualeDoc,
} from './procedureConcorsuali.js';

function doc(overrides: Partial<ProceduraConcorsualeDoc> = {}): ProceduraConcorsualeDoc {
  return {
    id: 'abc123',
    nome: 'TEST PROCEDURA SRL',
    rg: { completo: '76/2021', numero: '76', numero_base: '76', anno: 2021 },
    data_dichiarazione: '2026-07-08',
    tipo_code: 'F',
    tipo_procedura: 'Fallimento',
    tribunale: { nome: 'Modena', chiave: 'MODENA' },
    professionista: 'Mario Rossi',
    giudice_delegato: 'Anna Bianchi',
    debitore: {
      codice_fiscale: '03184060360',
      partita_iva: '03184060360',
      ragione_sociale: 'Test Procedura Srl',
      citta: 'MODENA',
      indirizzo: 'Via Test 1',
    },
    link: 'https://www.portalecreditori.it/procedura?id=abc123',
    estratto_il: '2026-08-04T10:33:31.000Z',
    scheda_letta_il: '2026-08-04T10:47:00.000Z',
    ...overrides,
  };
}

describe('tribunaleKey (DOMAIN_RULES §12)', () => {
  it('strips accents and apostrophes', () => {
    expect(tribunaleKey('Forlì')).toBe('FORLI');
    expect(tribunaleKey("Forli'")).toBe('FORLI');
  });

  it('strips the "Tribunale di" / "Tribunale (ordinario) di" prefix', () => {
    expect(tribunaleKey('Tribunale di Modena')).toBe('MODENA');
    expect(tribunaleKey('Tribunale (ordinario) di Modena')).toBe('MODENA');
  });

  it('applies both override-table rows', () => {
    expect(tribunaleKey('Tribunale di NAPOLI NORD IN AVERSA')).toBe('NAPOLI NORD');
    expect(tribunaleKey('Tribunale di VICENZA ex Tribunale di BASSANO DEL GRAPPA')).toBe(
      'VICENZA EX BASSANO',
    );
  });

  it('passes an un-overridden name through normalized', () => {
    expect(tribunaleKey('Tribunale di Roma')).toBe('ROMA');
  });

  it('returns an empty string for null/undefined/empty input', () => {
    expect(tribunaleKey(null)).toBe('');
    expect(tribunaleKey(undefined)).toBe('');
    expect(tribunaleKey('')).toBe('');
  });

  it('exposes the override table verbatim (DATA_MODEL.md §17.1 / DOMAIN_RULES.md §12)', () => {
    expect(PROCEDURA_TRIBUNALE_OVERRIDES).toEqual({
      'NAPOLI NORD IN AVERSA': 'NAPOLI NORD',
      'VICENZA EX BASSANO DEL GRAPPA': 'VICENZA EX BASSANO',
    });
  });
});

describe('proceduraMatchKey / proceduraDocKey (no partial-key matching)', () => {
  it('builds a key from all four listing-side fields, kind included', () => {
    expect(proceduraMatchKey('Tribunale di Modena', '76', '2021', 'Fallimentare')).toBe(
      'MODENA 76 2021 F',
    );
  });

  it.each([
    [null, '76', '2021'],
    ['Modena', null, '2021'],
    ['Modena', '76', null],
    ['', '76', '2021'],
  ])('returns null when any field is missing (%s, %s, %s)', (tribunale, numero, anno) => {
    expect(proceduraMatchKey(tribunale, numero, anno, 'Fallimentare')).toBeNull();
  });

  it('proceduraDocKey uses rg.numero_base, not rg.numero, and the doc’s own chiave', () => {
    const composite = doc({
      rg: { completo: '29-1/2021', numero: '29-1', numero_base: '29', anno: 2021 },
    });
    expect(proceduraDocKey(composite)).toBe('MODENA 29 2021 F');
    // The listing side's own numero ("29", the parent's number) must match
    // the doc's numero_base, not its full composite numero ("29-1").
    expect(proceduraMatchKey('Modena', '29', '2021', 'Fallimentare')).toBe(
      proceduraDocKey(composite),
    );
  });

  it('proceduraDocKey is null when rg or tribunale.chiave is missing', () => {
    expect(proceduraDocKey(doc({ rg: null }))).toBeNull();
    expect(proceduraDocKey(doc({ tribunale: { nome: 'Modena', chiave: null } }))).toBeNull();
  });

  it('proceduraDocKey is null for a document in neither register', () => {
    // It cannot be placed in a list, so matching it would be a guess.
    expect(proceduraDocKey(doc({ tipo_code: null }))).toBeNull();
    expect(proceduraDocKey(doc({ tipo_code: 'X' }))).toBeNull();
  });

  it('the two registers number independently, so the same number is two companies', () => {
    // Measured in the live data: 271 keys exist in both lists, naming
    // unrelated companies. This is why the kind is part of the key.
    const fallimento = doc({ nome: 'MC Soluzioni s.r.l.', tipo_code: 'F' });
    const liquidazione = doc({ nome: 'Edil Moderna S.a.s.', tipo_code: 'LG' });
    expect(proceduraDocKey(fallimento)).not.toBe(proceduraDocKey(liquidazione));
  });
});

describe('famigliaProceduraListing — which register a listing belongs to', () => {
  it.each([
    ['Fallimentare', 'F'],
    ['Fallimentare (nuovo Rito)', 'F'],
    ['Liquidazione Giudiziale (cci)', 'LG'],
  ])('%s belongs to register %s', (tipo, atteso) => {
    expect(famigliaProceduraListing(tipo)).toBe(atteso);
  });

  it.each([
    ['Nuovo Concordato Preventivo'],
    ['Concordato Preventivo'],
    ['Concordato Preventivo Omologato (cci)'],
    ['Liquidazione Coatta Amministrativa'],
    ['Liquidazione Controllata (cci)'],
    ['Esecuzioni Mobiliari Con Vendita Post Legge 80'],
    ['Volontaria Giurisdizione'],
  ])('%s has no counterpart in the source and can never match', (tipo) => {
    expect(famigliaProceduraListing(tipo)).toBeNull();
    expect(proceduraMatchKey('Modena', '76', '2021', tipo)).toBeNull();
  });

  it('"Liquidazione Volontaria - Giudiziale" is NOT a liquidazione giudiziale', () => {
    // It contains the word, which is exactly why the rule matches a prefix
    // rather than a substring: a voluntary liquidation is a different thing
    // and has no procedure on the portal.
    expect(famigliaProceduraListing('Liquidazione Volontaria - Giudiziale')).toBeNull();
  });

  it('an unrecognised kind never matches, rather than guessing a register', () => {
    // The safe direction: a missed match costs a badge, a wrong one puts
    // another company's debtor and curatore on an auction.
    expect(famigliaProceduraListing('Qualcosa Di Nuovo')).toBeNull();
    expect(famigliaProceduraListing(null)).toBeNull();
  });
});

describe('selectProceduraConcorsuale (DATA_MODEL.md §17.2)', () => {
  it('returns null on no match (the default outcome for most listings)', () => {
    const byKey = { 'MODENA 76 2021 F': doc() };
    expect(
      selectProceduraConcorsuale(byKey, {
        tribunale: 'Roma',
        numero: '1',
        anno: '2020',
        tipo_procedura: 'Fallimentare',
      }),
    ).toBeNull();
  });

  it('returns null when any listing-side field is null', () => {
    const byKey = { 'MODENA 76 2021 F': doc() };
    expect(
      selectProceduraConcorsuale(byKey, {
        tribunale: null,
        numero: '76',
        anno: '2021',
        tipo_procedura: 'Fallimentare',
      }),
    ).toBeNull();
  });

  it('a full match with scheda_letta_il set carries the debitore facts, available: true', () => {
    const byKey = { 'MODENA 76 2021 F': doc() };
    const selection = selectProceduraConcorsuale(byKey, {
      tribunale: 'Tribunale di Modena',
      numero: '76',
      anno: '2021',
      tipo_procedura: 'Fallimentare',
    });
    expect(selection?.available).toBe(true);
    expect(selection?.debitore?.codice_fiscale).toBe('03184060360');
  });

  it('a match with scheda_letta_il still null carries no debitore facts, available: false', () => {
    const indexOnly = doc({ scheda_letta_il: null, tipo_procedura: null, debitore: null });
    const byKey = { 'MODENA 76 2021 F': indexOnly };
    const selection = selectProceduraConcorsuale(byKey, {
      tribunale: 'Modena',
      numero: '76',
      anno: '2021',
      tipo_procedura: 'Fallimentare',
    });
    expect(selection?.available).toBe(false);
    expect(selection?.debitore).toBeNull();
    expect(selection?.nome).toBe(indexOnly.nome); // still shown, per §17.2
  });

  it('never leaks debitore facts even if the source doc had them but scheda_letta_il is null', () => {
    // Defensive: a document whose debitore somehow carries data despite an
    // unset scheda_letta_il must still be treated as "not yet available" --
    // the availability flag, not the presence of debitore data, is authoritative.
    const inconsistent = doc({ scheda_letta_il: null });
    const byKey = { 'MODENA 76 2021 F': inconsistent };
    const selection = selectProceduraConcorsuale(byKey, {
      tribunale: 'Modena',
      numero: '76',
      anno: '2021',
      tipo_procedura: 'Fallimentare',
    });
    expect(selection?.available).toBe(false);
    expect(selection?.debitore).toBeNull();
  });
});

describe('hasProceduraConcorsuale (table-indicator flag)', () => {
  it('true on any match, regardless of scheda_letta_il', () => {
    const byKey = { 'MODENA 76 2021 F': doc({ scheda_letta_il: null }) };
    expect(
      hasProceduraConcorsuale(byKey, {
        tribunale: 'Modena',
        numero: '76',
        anno: '2021',
        tipo_procedura: 'Fallimentare',
      }),
    ).toBe(true);
  });

  it('false on no match or missing listing fields', () => {
    const byKey = { 'MODENA 76 2021 F': doc() };
    expect(
      hasProceduraConcorsuale(byKey, {
        tribunale: 'Roma',
        numero: '1',
        anno: '2020',
        tipo_procedura: 'Fallimentare',
      }),
    ).toBe(false);
    expect(
      hasProceduraConcorsuale(byKey, {
        tribunale: null,
        numero: '76',
        anno: '2021',
        tipo_procedura: 'Fallimentare',
      }),
    ).toBe(false);
  });
});
