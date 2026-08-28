import { describe, expect, it } from 'vitest';
import {
  htmlIsEmpty,
  missingAcquisto,
  missingDestinatario,
  missingLettera,
  missingMittente,
  missingRinuncia,
  missingTesto,
  missingTutto,
} from './validazione.js';
import { AZIENDE } from '../data/aziende.js';
import type { CartaFormData } from '../types.js';

const vuoto = {} as CartaFormData;
const form = (over: Partial<CartaFormData> = {}): CartaFormData =>
  ({ ...vuoto, ...over }) as CartaFormData;

describe('htmlIsEmpty', () => {
  it('sees through tags and non-breaking spaces', () => {
    // A body the editor left as an empty paragraph must count as empty, or
    // the warning never fires on a letter with no text at all.
    expect(htmlIsEmpty('<p><br></p>')).toBe(true);
    expect(htmlIsEmpty('<p>&nbsp;</p>')).toBe(true);
    expect(htmlIsEmpty('   ')).toBe(true);
    expect(htmlIsEmpty(null)).toBe(true);
    expect(htmlIsEmpty('<p>Testo</p>')).toBe(false);
  });
});

describe('missingMittente', () => {
  it('asks for a sender only on the blank template', () => {
    const template = AZIENDE.find((a) => a.id === 'template-vuoto');
    const reale = AZIENDE.find((a) => a.id === 'oceania');
    expect(missingMittente(template, form())).toEqual(['Ragione sociale mittente']);
    // A real company carries its own name — asking would be nonsense.
    expect(missingMittente(reale, form())).toEqual([]);
    expect(missingMittente(template, form({ mittenteNome: 'Tizio S.r.l.' }))).toEqual([]);
  });
});

describe('missingDestinatario', () => {
  it('always needs a recipient', () => {
    expect(missingDestinatario(form())).toEqual(['Ragione sociale']);
    expect(missingDestinatario(form({ destinatarioNome: 'Rossi' }))).toEqual([]);
  });
});

describe('missingLettera', () => {
  it('asks for the amount and deadline only on a proposta', () => {
    expect(missingLettera('proposta', form({ oggetto: 'x' }))).toEqual([
      'Importo',
      'Scadenza finanziamento',
    ]);
    // The same blank form is complete for a free-form letter.
    expect(missingLettera('lettera', form({ oggetto: 'x' }))).toEqual([]);
  });
});

describe('missingRinuncia', () => {
  it('accepts a fiscal value of zero as an answer', () => {
    // The check is `=== ''`, not falsy: a credit written down to nothing is a
    // real figure, and treating 0 as unanswered would demand it forever.
    const pieno = form({
      destinatarioCF: 'X',
      importoCredito: '1',
      importoRinunciato: '1',
      legaleNome: 'Tizio',
      valoreFiscale: '0',
    });
    expect(missingRinuncia(pieno)).toEqual([]);
    expect(missingRinuncia({ ...pieno, valoreFiscale: '' })).toEqual([
      'Valore fiscale del credito',
    ]);
  });
});

describe('missingAcquisto', () => {
  const base = form({
    cessionarioId: 'c',
    masterServicer: 'm',
    debitore: 'd',
    importoCrediti: '1',
    corrispettivo: '1',
    scadenzaOfferta: '2026-09-30',
    corrispettivoTipo: 'fisso',
  });

  it('is satisfied by a fixed price', () => {
    expect(missingAcquisto(base)).toEqual([]);
  });

  it('asks for the earn-out terms only when the price is an earn-out', () => {
    expect(missingAcquisto({ ...base, corrispettivoTipo: 'earnout' })).toEqual([
      'Soglia riparto concorsuale',
      'Scadenza incasso riparto',
      'Corrispettivo aggiuntivo',
    ]);
  });
});

describe('missingTesto', () => {
  it('requires a body only on a free-form letter', () => {
    const f = form({ apertura: 'Egregi', chiusura: 'Saluti', testo: '<p><br></p>' });
    expect(missingTesto('lettera', f)).toEqual(['Corpo del testo']);
    // Other types generate their body from a template, so an empty one is fine.
    expect(missingTesto('proposta', f)).toEqual([]);
  });
});

describe('missingTutto', () => {
  it('gathers only the sections that apply to this document type', () => {
    const azienda = AZIENDE.find((a) => a.id === 'oceania');
    const f = form({ oggetto: 'x', apertura: 'a', chiusura: 'c', destinatarioNome: 'R' });
    // A `lettera` must not be asked for the rinuncia or acquisto fields.
    expect(missingTutto('lettera', azienda, f)).toEqual(['Corpo del testo']);
    // A `rinuncia` is.
    expect(missingTutto('rinuncia', azienda, f)).toContain('C.F. società destinataria');
    expect(missingTutto('rinuncia', azienda, f)).not.toContain('Cessionario');
  });
});
