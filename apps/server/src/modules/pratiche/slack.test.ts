// Message building is pure, so it is asserted directly. `notify` is tested
// for the one property that matters operationally: it never throws, whatever
// Slack does — a saved pratica must stay saved.
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { Pratica } from '@pvp/shared';
import { buildMessage, notify } from './slack.js';

function pratica(over: Partial<Pratica> = {}): Pratica {
  return {
    id: 'p1',
    ndg: '229613-030529',
    numero_pratica: '163354',
    portafoglio: 'Diocleziano',
    stato: 'richiesto',
    n_scatole: '3, 7',
    note: null,
    ordinato_da: null,
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

const logger = { warn: () => {} };

describe('buildMessage', () => {
  it('mentions with the member-ID syntax, the only form Slack notifies on', () => {
    // "@mario" as plain text renders literally and pings nobody.
    expect(buildMessage(pratica(), { kind: 'creata' }, 'U01234ABC')).toContain('<@U01234ABC>');
  });

  it('omits the mention entirely when none is configured', () => {
    const msg = buildMessage(pratica(), { kind: 'creata' });
    expect(msg).not.toContain('<@');
    expect(msg).toContain('Nuova pratica cartacea');
  });

  it('announces a transition naming both ends', () => {
    const msg = buildMessage(pratica({ stato: 'consegnato' }), {
      kind: 'stato',
      precedente: 'spedito',
    });
    expect(msg).toContain('Spedito → *Consegnato*');
  });

  it('spells the stage in Italian, never the stored code', () => {
    const msg = buildMessage(pratica({ stato: 'archiviato' }), {
      kind: 'stato',
      precedente: 'consegnato',
    });
    expect(msg).toContain('Archiviato / rientrato');
    expect(msg).not.toContain('archiviato:');
  });

  it('escapes the three characters Slack mrkdwn reserves', () => {
    // Without this a debtor named "Rossi & C. <srl>" arrives mangled.
    const msg = buildMessage(pratica({ note: 'Rossi & C. <srl>' }), { kind: 'creata' });
    expect(msg).toContain('Rossi &amp; C. &lt;srl&gt;');
    expect(msg).not.toContain('<srl>');
  });

  it('formats the cost in euros with an Italian comma', () => {
    expect(buildMessage(pratica({ costo_spedizione_cent: 1250 }), { kind: 'creata' })).toContain(
      '€ 12,50',
    );
  });

  it('leaves out the fields that are empty instead of printing blanks', () => {
    const msg = buildMessage(pratica(), { kind: 'creata' });
    expect(msg).not.toContain('Note:');
    expect(msg).not.toContain('Costo spedizione:');
    expect(msg).not.toContain('null');
    expect(msg).toContain('Scatole:'); // the ones that ARE set still appear
  });
});

describe('notify', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does nothing, quietly, when no webhook is configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await notify({}, pratica(), { kind: 'creata' }, logger);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts the message as JSON to the webhook', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);
    await notify(
      { webhookUrl: 'https://hooks.slack.test/x', mentionId: 'U9' },
      pratica(),
      {
        kind: 'creata',
      },
      logger,
    );
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://hooks.slack.test/x');
    expect(JSON.parse(init.body).text).toContain('<@U9>');
  });

  it('swallows a network failure — a saved pratica stays saved', async () => {
    // The whole point: Slack being down must not turn a successful write into
    // a 500 for the operator.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(
      notify({ webhookUrl: 'https://hooks.slack.test/x' }, pratica(), { kind: 'creata' }, logger),
    ).resolves.toBeUndefined();
  });

  it('swallows a refusal from Slack and logs it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const warn = vi.fn();
    await expect(
      notify({ webhookUrl: 'https://hooks.slack.test/x' }, pratica(), { kind: 'creata' }, { warn }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
