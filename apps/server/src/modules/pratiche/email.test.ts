// The creation email. `buildEmail` is pure, so what the mail server will
// actually be handed is assertable without a network or a stub.
import { describe, expect, it } from 'vitest';
import type { Pratica } from '@pvp/shared';
import { buildEmail, configurato } from './email.js';

function pratica(over: Partial<Pratica> = {}): Pratica {
  return {
    id: 'p1',
    ndg: ['229613-030529'],
    numero_pratica: '163354',
    portafoglio: 'Diocleziano',
    stato: 'richiesto',
    n_scatole: '3, 7',
    note: null,
    ordinato_da: null,
    slack_tag_user_ids: [],
    data_richiesta: '2026-09-08',
    data_spedizione: null,
    data_consegna_prevista: '2026-09-15',
    data_consegna_effettiva: null,
    costo_spedizione_cent: 1250,
    created_at: '2026-09-08T09:00:00.000Z',
    created_by: 'u1',
    updated_at: null,
    updated_by: null,
    ...over,
  };
}

describe('configurato', () => {
  it('is off until a host, a sender and a recipient all exist', () => {
    // Absent configuration is "off", not an error: this ships before the
    // credentials do, and development and the emulator never have them.
    expect(configurato({})).toBe(false);
    expect(configurato({ host: 'smtp.test' })).toBe(false);
    expect(configurato({ host: 'smtp.test', from: 'a@test.it' })).toBe(false);
    expect(configurato({ host: 'smtp.test', from: 'a@test.it', to: 'b@test.it' })).toBe(true);
  });
});

describe('buildEmail', () => {
  it('names every NDG in the subject, not just the first', () => {
    // An order covering four positions must read as four: a subject line
    // naming one of them is how the wrong file gets pulled.
    const m = buildEmail(pratica({ ndg: ['900123', '111222', '333444'] }));
    expect(m.subject).toBe('Nuova pratica cartacea — NDG 900123, 111222, 333444');
  });

  it('carries a plain-text part as well as HTML', () => {
    // Not belt-and-braces: several spam filters score a missing text/plain
    // alternative, and it is what a watch or a terminal client displays.
    const m = buildEmail(pratica());
    expect(m.text).toContain('Numero pratica: 163354');
    expect(m.text).toContain('Costo spedizione: € 12,50');
    expect(m.html).toContain('<table');
  });

  it('writes dates and money the way the rest of the product does', () => {
    const m = buildEmail(pratica());
    expect(m.text).toContain('Richiesta il: 08/09/2026'); // not the ISO form
    expect(m.text).toContain('Consegna prevista: 15/09/2026');
    expect(m.text).toContain('€ 12,50'); // comma, two digits
  });

  it('omits a field that has no value instead of printing an empty row', () => {
    const m = buildEmail(pratica({ portafoglio: null, note: null, costo_spedizione_cent: null }));
    expect(m.text).not.toContain('Portafoglio');
    expect(m.text).not.toContain('Note');
    expect(m.text).not.toContain('Costo spedizione');
  });

  it('escapes free text, so a debtor name cannot inject markup', () => {
    // Notes and portfolio names are typed by hand and are not trusted.
    const m = buildEmail(pratica({ note: 'Rossi & C. <script>alert(1)</script>' }));
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).toContain('Rossi &amp; C.');
  });

  it('links straight to the pratica when a base URL is configured', () => {
    const m = buildEmail(pratica({ id: 'abc 123' }), 'https://pvp-aste.web.app/');
    // The id is encoded, and the trailing slash of the base does not double.
    expect(m.text).toContain('https://pvp-aste.web.app/pratiche?pratica=abc%20123');
    expect(m.html).toContain('href="https://pvp-aste.web.app/pratiche?pratica=abc%20123"');
  });

  it('carries no link at all when there is no base URL', () => {
    // Better nothing than a relative address that resolves against the
    // reader's mail client.
    const m = buildEmail(pratica());
    expect(m.text).not.toContain('Apri la pratica');
    expect(m.html).not.toContain('<a href');
  });
});
