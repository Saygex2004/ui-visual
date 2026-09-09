// Il testo della richiesta all'archivio. `buildRichiesta` è puro, quindi ciò
// che Eugenia leggerà è verificabile senza rete né code.
import { describe, expect, it } from 'vitest';
import type { Pratica } from '@pvp/shared';
import { buildRichiesta, replyToPerPratica } from './email.js';

function pratica(over: Partial<Pratica> = {}): Pratica {
  return {
    id: 'p1',
    ndg: ['1439529'],
    numero_pratica: '163354',
    intestatario: 'IMPRESA ZANELLATI SRL',
    portafoglio: 'Diocleziano',
    stato: 'richiesto',
    n_scatole: null,
    note: null,
    ordinato_da: null,
    slack_tag_user_ids: [],
    data_richiesta: null,
    data_spedizione: null,
    data_consegna_prevista: null,
    data_consegna_effettiva: null,
    costo_spedizione_cent: null,
    created_at: '2026-09-09T09:00:00.000Z',
    created_by: 'u1',
    updated_at: null,
    updated_by: null,
    ...over,
  };
}

describe('buildRichiesta', () => {
  it('compone la richiesta concordata con l’archivio', () => {
    const m = buildRichiesta(pratica());
    expect(m.text).toBe(
      [
        'Ciao Eugenia,',
        '',
        'avremmo bisogno del fascicolo cartaceo relativo alla posizione in oggetto:',
        '',
        'Intestatario: IMPRESA ZANELLATI SRL',
        'NDG: 1439529',
        'Riferimento operazione: Cessione Diocleziano / DPZ NPL',
        '',
        'Vi chiediamo di organizzare la spedizione presso i nostri uffici il prima possibile, applicando la tariffa ordinaria di € 12,50 a nostro carico.',
        '',
        'Restiamo in attesa di un vostro riscontro.',
        '',
        'Grazie mille,',
      ].join('\n'),
    );
  });

  it('nomina la posizione nell’oggetto, perché il corpo ci rimanda', () => {
    // Il testo dice "la posizione in oggetto": deve esserci davvero qualcosa
    // a cui quel rimando punti.
    expect(buildRichiesta(pratica()).subject).toBe(
      'Richiesta fascicolo cartaceo — IMPRESA ZANELLATI SRL (NDG 1439529)',
    );
  });

  it('elenca tutti gli NDG di un ordine, non solo il primo', () => {
    const m = buildRichiesta(pratica({ ndg: ['1439529', '900123', '777'] }));
    expect(m.text).toContain('NDG: 1439529, 900123, 777');
    expect(m.subject).toContain('NDG 1439529, 900123, 777');
  });

  it('omette una riga senza dato invece di scrivere un’etichetta vuota', () => {
    // "Intestatario:" seguito dal nulla, in una richiesta su cui qualcuno deve
    // agire, è peggio della riga assente.
    const m = buildRichiesta(pratica({ intestatario: null, portafoglio: null }));
    expect(m.text).not.toContain('Intestatario:');
    expect(m.text).not.toContain('Riferimento operazione:');
    expect(m.text).toContain('NDG: 1439529');
    expect(m.subject).toBe('Richiesta fascicolo cartaceo — NDG 1439529');
  });

  it('la tariffa resta quella ordinaria, non il costo della singola spedizione', () => {
    // Sono due cose diverse: la tariffa concordata con l'archivio è fissa, il
    // costo effettivo si registra sulla pratica.
    const m = buildRichiesta(pratica({ costo_spedizione_cent: 4200 }));
    expect(m.text).toContain('tariffa ordinaria di € 12,50');
    expect(m.text).not.toContain('42,00');
  });

  it('protegge il markup da un intestatario con caratteri speciali', () => {
    const m = buildRichiesta(pratica({ intestatario: 'Rossi & C. <srl>' }));
    expect(m.html).not.toContain('<srl>');
    expect(m.html).toContain('Rossi &amp; C. &lt;srl&gt;');
    expect(m.text).toContain('Rossi & C. <srl>'); // il testo semplice resta tale
  });
});

describe('replyToPerPratica', () => {
  it('inserisce l’id della pratica con la notazione +', () => {
    expect(replyToPerPratica('testoleposta@gmail.com', 'VonnyY4jr')).toBe(
      'testoleposta+VonnyY4jr@gmail.com',
    );
  });

  it('lascia stare un indirizzo che ha già un +', () => {
    // Aggiungerne un secondo produrrebbe un indirizzo che non esiste.
    expect(replyToPerPratica('posta+altro@gmail.com', 'X')).toBe('posta+altro@gmail.com');
  });

  it('non tocca una stringa che non è un indirizzo', () => {
    expect(replyToPerPratica('senza-chiocciola', 'X')).toBe('senza-chiocciola');
  });

  it('usa l’ultima chiocciola, non la prima', () => {
    // Un local part può contenere una chiocciola fra virgolette; spezzare
    // sulla prima produrrebbe un dominio sbagliato.
    expect(replyToPerPratica('"a@b"@esempio.it', 'X')).toBe('"a@b"+X@esempio.it');
  });
});
