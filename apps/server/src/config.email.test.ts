// I destinatari della richiesta all'archivio, e il dettaglio di distribuzione
// che manderebbe giù il servizio se fosse sbagliato.
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const MINIMO = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'demo',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
} satisfies NodeJS.ProcessEnv;

describe('destinatari della richiesta fascicolo', () => {
  it('legge destinatario e copia', () => {
    const c = loadConfig({
      ...MINIMO,
      PVPDASH_EMAIL_TO: 'oleksandr@duepuntozero.net',
      PVPDASH_EMAIL_CC: 'alessia@duepuntozero.net',
    });
    expect(c.PVPDASH_EMAIL_TO).toBe('oleksandr@duepuntozero.net');
    expect(c.PVPDASH_EMAIL_CC).toBe('alessia@duepuntozero.net');
  });

  it('tratta il VUOTO come assente, non come malformato', () => {
    // `gcloud run deploy --set-env-vars FOO=` scrive la stringa vuota. Lo
    // script di deploy le passa sempre, quindi senza questo un'installazione
    // senza destinatario passerebbe "" a un campo valido-se-presente e il
    // server rifiuterebbe di avviarsi: un'impostazione di posta che manda giù
    // l'intero servizio.
    const c = loadConfig({ ...MINIMO, PVPDASH_EMAIL_TO: '', PVPDASH_EMAIL_CC: '' });
    expect(c.PVPDASH_EMAIL_TO).toBeUndefined();
    expect(c.PVPDASH_EMAIL_CC).toBeUndefined();
  });

  it('rifiuta comunque un indirizzo presente ma sbagliato', () => {
    // Vuoto significa "spento"; un refuso è un refuso, e va detto ad alta voce
    // invece di spegnere le notifiche in silenzio.
    expect(() => loadConfig({ ...MINIMO, PVPDASH_EMAIL_TO: 'non-una-mail' })).toThrow();
  });
});
