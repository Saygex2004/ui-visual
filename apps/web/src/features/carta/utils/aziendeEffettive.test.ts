// Turning a stored company into the shape the letter speaks. The interesting
// case is the header: what is printed across the top, and when nothing is.
import { describe, expect, it } from 'vitest';
import type { CartaAzienda } from '@pvp/shared';
import { aziendeDestinatarie, aziendeMittenti, daRecord } from './aziendeEffettive.js';
import { AZIENDE } from '../data/aziende.js';

function record(over: Partial<CartaAzienda> = {}): CartaAzienda {
  return {
    id: 'az-1',
    nome: 'Nuova Azienda S.r.l.',
    nome_header: null,
    sottotitolo: null,
    via: 'Via Prova 1',
    cap: '20100',
    citta: 'Milano',
    pec: 'prova@legalmail.it',
    email: null,
    cf: null,
    citta_data: null,
    footer_text: null,
    header_color: null,
    header_size: null,
    logo: null,
    logo_width: null,
    logo_height: null,
    usabile_come_mittente: true,
    stampa_nome_intestazione: true,
    created_at: '2026-09-07T10:00:00.000Z',
    created_by: 'u1',
    updated_at: null,
    updated_by: null,
    ...over,
  };
}

describe('intestazione', () => {
  it('prints the name when asked, falling back to the legal one', () => {
    expect(daRecord(record()).nomeHeader).toBe('Nuova Azienda S.r.l.');
    expect(daRecord(record({ nome_header: 'NUOVA AZIENDA' })).nomeHeader).toBe('NUOVA AZIENDA');
  });

  it('prints nothing when the choice is off', () => {
    // A bare head of page is a real letterhead: pre-printed paper, or one
    // whose identity lives only in the footer. Empty is how the shipped blank
    // template says the same thing.
    expect(daRecord(record({ stampa_nome_intestazione: false })).nomeHeader).toBe('');
    // …even when a header name was typed and then switched off.
    expect(
      daRecord(record({ nome_header: 'NUOVA AZIENDA', stampa_nome_intestazione: false }))
        .nomeHeader,
    ).toBe('');
  });
});

describe('mittenti e destinatari sono due liste', () => {
  const soloDest = record({
    id: 'solo-dest',
    nome: 'Scrivimi S.p.A.',
    usabile_come_mittente: false,
  });
  const entrambi = record({ id: 'entrambi', nome: 'Scrivo Anch’io S.r.l.' });

  it('offers a recipient-only company to write TO but not FROM', () => {
    const mittenti = aziendeMittenti([soloDest, entrambi]).map((a) => a.id);
    expect(mittenti).toContain('entrambi');
    expect(mittenti).not.toContain('solo-dest');

    expect(aziendeDestinatarie([soloDest, entrambi]).map((a) => a.id)).toContain('solo-dest');
  });

  it('never drops the shipped companies', () => {
    // Added ones are ON TOP of those in code, never instead of them.
    for (const lista of [aziendeMittenti([]), aziendeDestinatarie([])]) {
      expect(lista.length).toBe(AZIENDE.length);
    }
    expect(aziendeMittenti([entrambi]).length).toBe(AZIENDE.length + 1);
  });
});
