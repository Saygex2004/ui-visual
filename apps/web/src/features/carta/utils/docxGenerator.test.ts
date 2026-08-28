// The generator is a port of working JavaScript, so these tests exist to prove
// the port did not change what a signed document says. They build a real
// .docx and read it back — a Word file is a zip of XML, and a malformed one
// throws nothing here; Word simply refuses to open it.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { Packer } from 'docx';
import { buildDocument } from './docxGenerator.js';
import { AZIENDE } from '../data/aziende.js';
import type { DocumentoInput } from '../types.js';

function input(over: Partial<DocumentoInput> = {}): DocumentoInput {
  return {
    tipo: 'lettera',
    data: '2026-08-27',
    destinatarioNome: 'Rossi & C. S.r.l.',
    destinatarioVia: 'Via Roma, 1',
    destinatarioCap: '20100',
    destinatarioCitta: 'Milano',
    destinatarioPec: 'rossi@legalmail.it',
    destinatarioCF: '',
    destinatarioReferente: '',
    oggetto: 'Oggetto di prova',
    apertura: 'Egregi Signori,',
    testo: 'Primo capoverso.\n\nSecondo capoverso.',
    chiusura: 'Cordiali saluti.',
    importo: '',
    importoLettere: '',
    scadenza: '',
    tasso: '',
    conErogazione: false,
    mittenteNome: '',
    firmaSenza: false,
    firmaIntestazione: '',
    numFirmatari: 1,
    firmatario1Nome: 'Silvia Caviglia',
    firmatario1Carica: 'Amministratore Unico',
    firmatario2Nome: '',
    firmatario2Carica: '',
    testoPropostaOriginale: '',
    importoCredito: '',
    importoRinunciato: '',
    dataSituazione: '',
    valoreFiscale: '',
    legaleNome: '',
    legaleCarica: '',
    legaleGenere: 'M',
    cessionarioId: '',
    masterServicer: '',
    debitore: '',
    ndg: '',
    assuntoExtraTipo: '',
    concordatoTribunale: '',
    concordatoNumero: '',
    concordatoImporto: '',
    ipotecarioGrado: '',
    assuntoExtraLibero: '',
    importoCrediti: '',
    importoCreditiLettere: '',
    corrispettivoTipo: 'fisso',
    corrispettivo: '',
    corrispettivoLettere: '',
    earnoutSoglia: '',
    earnoutSogliaLettere: '',
    earnoutScadenza: '',
    earnoutImporto: '',
    earnoutImportoLettere: '',
    scadenzaOfferta: '',
    ...over,
  };
}

/** The document, unzipped, as the XML Word will read. */
async function documentXml(azId: string, over: Partial<DocumentoInput> = {}): Promise<string> {
  const azienda = AZIENDE.find((a) => a.id === azId)!;
  const doc = await buildDocument(azienda, input(over));
  const buffer = await Packer.toBuffer(doc);
  const zip = unzipSync(new Uint8Array(buffer));
  return strFromU8(zip['word/document.xml']!);
}

beforeEach(() => {
  // The logo fetch is the only I/O in the generator. Stubbed with a 1x1 PNG so
  // the tests stay offline and deterministic.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
    }),
  );
  vi.stubGlobal('window', { location: { origin: 'https://pvp-aste.web.app' } });
});

describe('buildDocument', () => {
  it('produces a Word package with a document part', async () => {
    const azienda = AZIENDE.find((a) => a.id === 'oceania')!;
    const buffer = await Packer.toBuffer(await buildDocument(azienda, input()));
    const zip = unzipSync(new Uint8Array(buffer));
    expect(Object.keys(zip)).toContain('word/document.xml');
    expect(new Uint8Array(buffer).subarray(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
  });

  it('carries the recipient and the subject into the document', async () => {
    const xml = await documentXml('oceania');
    expect(xml).toContain('Rossi &amp; C. S.r.l.');
    expect(xml).toContain('Oggetto di prova');
    expect(xml).toContain('Via Roma, 1');
  });

  it('writes the date in Italian, not in the stored ISO form', async () => {
    const xml = await documentXml('oceania', { data: '2026-08-27' });
    expect(xml).toContain('27 agosto 2026');
    expect(xml).not.toContain('2026-08-27');
  });

  it('splits a blank line into separate paragraphs, for a plain-text body', async () => {
    // `proposta` routes a non-HTML body through textToParagraphs.
    const xml = await documentXml('oceania', { tipo: 'proposta' });
    expect(xml).toContain('Primo capoverso.');
    expect(xml).toContain('Secondo capoverso.');
  });

  it('DROPS a plain-text body on a `lettera` — inherited behaviour, not a port bug', async () => {
    // `lettera` always routes through the HTML path, and that walk only visits
    // element children: a bare text node has no element to visit, so the body
    // silently vanishes. Reachable if the free-form letter is ever fed plain
    // text instead of rich text. Pinned here so the behaviour is visible and a
    // future fix is deliberate; flagged to the owner rather than changed,
    // since it alters what a signed document contains.
    const xml = await documentXml('oceania', { tipo: 'lettera' });
    expect(xml).not.toContain('Primo capoverso.');

    // The same letter WITH rich text keeps its body.
    const rich = await documentXml('oceania', {
      tipo: 'lettera',
      testo: '<p>Primo capoverso.</p>',
    });
    expect(rich).toContain('Primo capoverso.');
  });

  it('renders rich text as formatting, not as literal tags', async () => {
    const xml = await documentXml('oceania', { testo: '<p>Testo <strong>grassetto</strong>.</p>' });
    expect(xml).toContain('<w:b/>'); // real bold, not "<strong>"
    expect(xml).not.toContain('&lt;strong&gt;');
  });

  it('signs with the name and role given', async () => {
    const xml = await documentXml('oceania');
    expect(xml).toContain('Silvia Caviglia');
    expect(xml).toContain('Amministratore Unico');
  });

  it('omits the signature block entirely when asked to', async () => {
    const xml = await documentXml('oceania', { firmaSenza: true });
    expect(xml).not.toContain('Silvia Caviglia');
  });

  it('builds the two-column header for the company that needs one', async () => {
    // Frigo Sud carries its registry details in the header and has no footer.
    // Headers are their OWN part of the package — looking for them in
    // document.xml finds nothing, which is what the first draft of this test
    // did.
    const azienda = AZIENDE.find((a) => a.id === 'frigo-sud')!;
    const buffer = await Packer.toBuffer(await buildDocument(azienda, input()));
    const zip = unzipSync(new Uint8Array(buffer));
    const headers = Object.keys(zip).filter((k) => k.startsWith('word/header'));
    expect(headers.length).toBeGreaterThan(0);
    const testa = headers.map((k) => strFromU8(zip[k]!)).join('');
    expect(testa).toContain('con socio unico');
    expect(testa).toContain('01112020803');
  });

  it('reaches every company without throwing', async () => {
    // The data varies a lot — logo or none, special header, blank template —
    // and a shape the generator cannot handle should fail here, not in Word.
    for (const azienda of AZIENDE) {
      const doc = await buildDocument(azienda, input());
      await expect(Packer.toBuffer(doc)).resolves.toBeDefined();
    }
  });
});
