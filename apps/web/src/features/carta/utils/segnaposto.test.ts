import { describe, expect, it } from 'vitest';
import {
  SEGNAPOSTO_VALIDI,
  controllaSegnaposto,
  daConfermare,
  segnapostoUsati,
} from './segnaposto.js';
import { TESTI_DEFAULT } from '../data/aziende.js';

describe('segnapostoUsati', () => {
  it('lists each token once, in the order it first appears', () => {
    expect(segnapostoUsati('Caro {{DESTINATARIO}}, euro {{IMPORTO}} a {{DESTINATARIO}}.')).toEqual([
      'DESTINATARIO',
      'IMPORTO',
    ]);
  });

  it('ignores anything that is not a token', () => {
    expect(segnapostoUsati('nessun segnaposto qui')).toEqual([]);
    expect(segnapostoUsati('{{minuscolo}} {{Misto}} {non doppio}')).toEqual([]);
  });
});

describe('controllaSegnaposto', () => {
  it('reports a token the edit dropped — the dangerous case', () => {
    // Rewording a sentence and losing {{CORRISPETTIVO}} produces documents
    // with no price, and nothing else would say so.
    const esito = controllaSegnaposto(
      'Prezzo {{CORRISPETTIVO}} entro {{SCADENZA}}.',
      'Prezzo da concordare entro {{SCADENZA}}.',
    );
    expect(esito.rimossi).toEqual(['CORRISPETTIVO']);
    expect(daConfermare(esito)).toBe(true);
  });

  it('reports a typo, which would reach the document with its braces showing', () => {
    const esito = controllaSegnaposto('{{CORRISPETTIVO}}', '{{CORRISPETIVO}}');
    expect(esito.sconosciuti).toEqual(['CORRISPETIVO']);
    expect(esito.rimossi).toEqual(['CORRISPETTIVO']);
    expect(daConfermare(esito)).toBe(true);
  });

  it('treats adding a real token as harmless, but still names it', () => {
    const esito = controllaSegnaposto(
      'Caro {{DESTINATARIO}}.',
      'Caro {{DESTINATARIO}}, NDG {{NDG}}.',
    );
    expect(esito.aggiunti).toEqual(['NDG']);
    expect(esito.rimossi).toEqual([]);
    expect(daConfermare(esito)).toBe(false);
  });

  it('says nothing about an edit that only changes wording', () => {
    const esito = controllaSegnaposto('Egregi, {{IMPORTO}}.', 'Spettabile, {{IMPORTO}}.');
    expect(esito).toEqual({ rimossi: [], sconosciuti: [], aggiunti: [] });
    expect(daConfermare(esito)).toBe(false);
  });
});

describe('the shipped templates', () => {
  it('use only tokens the generator actually substitutes', () => {
    // If this fails, either a template has a typo or the generator lost a
    // variable — both produce documents with visible {{BRACES}}.
    for (const [tipo, testi] of Object.entries(TESTI_DEFAULT)) {
      for (const [campo, testo] of Object.entries(testi)) {
        if (typeof testo !== 'string') continue;
        const ignoti = segnapostoUsati(testo).filter(
          (s) => !SEGNAPOSTO_VALIDI.includes(s as (typeof SEGNAPOSTO_VALIDI)[number]),
        );
        expect({ tipo, campo, ignoti }).toEqual({ tipo, campo, ignoti: [] });
      }
    }
  });
});
