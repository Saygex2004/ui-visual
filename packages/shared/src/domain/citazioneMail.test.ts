import { describe, expect, it } from 'vitest';
import { separaCitazione } from './citazioneMail.js';

/** La risposta vera arrivata in produzione il 10/09/2026. L'attribuzione di
 *  Gmail va a capo DENTRO l'indirizzo: è il caso che una ricerca riga per riga
 *  non troverebbe, ed è il motivo per cui la chiusura si cerca anche più
 *  sotto. */
const RISPOSTA_REALE = [
  'Ricevuto, provvediamo domani.',
  '',
  'Il giorno gio 10 set 2026 alle ore 10:13 <',
  'testoleposta@12096813.brevosend.com> ha scritto:',
  '',
  '> Ciao Eugenia,',
  '>',
  '> avremmo bisogno del fascicolo cartaceo relativo alla posizione in oggetto:',
  '>',
  '> Intestatario: *SAL DA VINCI*',
  '> NDG: *21312312*',
  '>',
  '> Grazie mille,',
  '>',
].join('\n');

describe('separaCitazione', () => {
  it('taglia la citazione di Gmail anche quando l’attribuzione va a capo', () => {
    const { nuovo, citato } = separaCitazione(RISPOSTA_REALE);
    expect(nuovo).toBe('Ricevuto, provvediamo domani.');
    expect(citato).toContain('Il giorno gio 10 set 2026');
    expect(citato).toContain('SAL DA VINCI');
  });

  it('lascia intatta una risposta che non cita niente', () => {
    const testo = 'Ricevuto.\n\nA presto,\nEugenia';
    expect(separaCitazione(testo)).toEqual({ nuovo: testo, citato: '' });
  });

  it('non scambia per attribuzione una frase che comincia allo stesso modo', () => {
    // «Il giorno» apre l'attribuzione di Gmail, ma apre anche molte frasi:
    // senza la chiusura `ha scritto:` qui si perderebbe tutta la risposta.
    const testo = 'Il giorno in cui ci siamo sentiti avevo capito diversamente.\nFammi sapere.';
    expect(separaCitazione(testo).nuovo).toBe(testo);
    expect(separaCitazione(testo).citato).toBe('');
  });

  it('riconosce l’intestazione ricopiata da Outlook', () => {
    const testo = [
      'Va bene.',
      '',
      'Da: Tizio <tizio@esempio.it>',
      'Inviato: giovedì 10 settembre 2026 10:13',
      'Oggetto: Richiesta fascicolo',
      '',
      'Ciao Eugenia,',
    ].join('\n');
    expect(separaCitazione(testo).nuovo).toBe('Va bene.');
  });

  it('non taglia su `Da:` da solo, che può essere l’inizio di una frase', () => {
    const testo = 'Da: verificare con l’archivio.\nTi aggiorno.';
    expect(separaCitazione(testo).citato).toBe('');
  });

  it('riconosce il separatore esplicito', () => {
    const testo = 'Ok.\n\n-----Messaggio originale-----\nCiao Eugenia,';
    expect(separaCitazione(testo).nuovo).toBe('Ok.');
  });

  it('taglia un blocco `>` anche senza attribuzione', () => {
    const testo = 'Confermo.\n\n> Ciao Eugenia,\n> avremmo bisogno';
    expect(separaCitazione(testo).nuovo).toBe('Confermo.');
  });

  it('NON taglia quando la risposta è scritta dentro la citazione', () => {
    // Rispondere punto per punto è legittimo, e tagliare al primo `>`
    // butterebbe via proprio le risposte. Meglio mostrare tutto.
    const testo = [
      '> NDG: 21312312',
      'Questo lo abbiamo già.',
      '> Intestatario: SAL DA VINCI',
      'Questo no, serve il numero di pratica.',
    ].join('\n');
    expect(separaCitazione(testo)).toEqual({ nuovo: testo, citato: '' });
  });

  it('mostra tutto quando chi risponde scrive SOTTO la citazione', () => {
    // Tagliare lascerebbe una risposta vuota: peggio di una lunga.
    const testo = [
      'Il giorno gio 10 set 2026 <a@b.it> ha scritto:',
      '> Ciao Eugenia,',
      '',
      'Provvediamo noi.',
    ].join('\n');
    expect(separaCitazione(testo)).toEqual({ nuovo: testo, citato: '' });
  });

  it('non modifica mai il testo di partenza', () => {
    const testo = RISPOSTA_REALE;
    separaCitazione(testo);
    expect(testo).toBe(RISPOSTA_REALE);
  });
});
