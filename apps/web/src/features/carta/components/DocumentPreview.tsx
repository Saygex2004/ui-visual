// The on-screen page: what the Word document will look like, at scale.
//
// Almost entirely inline styles rather than classes, deliberately kept that
// way from the original: this element is a reproduction of a printed A4 page
// (794px is A4 at 96dpi), so its appearance must not follow the dashboard's
// light/dark theme the way the surrounding chrome does. A letterhead is white
// paper with black ink in both.
//
// eslint-disable react/jsx-no-literals, react/no-unescaped-entities --
// the literals in here are the DOCUMENT's words ("Spettabile", "Oggetto:",
// "dichiaro di avere irrevocabilmente..."), not interface chrome. Routing
// them through i18n would be wrong twice over: an Italian letterhead is
// Italian whatever language the dashboard is set to, and the wording is legal
// text signed off by the business — it must not become translatable copy that
// someone could reword.
/* eslint-disable react/jsx-no-literals, react/no-unescaped-entities */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { formatDateItalian, formatEuro, isHtml } from '../utils/format.js';
import type { Azienda } from '../data/aziende.js';
import type { CartaFormData, TipoLettera } from '../types.js';
import { importoInLettere } from '../utils/numeroInLettere.js';
import { CESSIONARI_POSSIBILI } from '../data/aziende';
import { EditableHtml } from './EditableHtml.js';

type PreviewBlock =
  | { type: 'text'; lines: string[] }
  | { type: 'tab'; label: string; body: string }
  | { type: 'empty' };

function parseBlocks(text: string): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  let buf: string[] = [];
  text.split('\n').forEach((line: string) => {
    if (line.includes('\t')) {
      if (buf.length) {
        blocks.push({ type: 'text', lines: buf });
        buf = [];
      }
      const ti = line.indexOf('\t');
      blocks.push({ type: 'tab', label: line.slice(0, ti), body: line.slice(ti + 1) });
    } else if (line.trim() === '') {
      if (buf.length) {
        blocks.push({ type: 'text', lines: buf });
        buf = [];
      }
    } else {
      buf.push(line);
    }
  });
  if (buf.length) blocks.push({ type: 'text', lines: buf });
  return blocks;
}

export interface DocumentPreviewProps {
  azienda: Azienda;
  formData: CartaFormData;
  tipo: TipoLettera;
  /** Zoom of the reproduced A4 page. */
  scale?: number;
  /** Whether the body can be edited straight on the page. */
  editableBody?: boolean;
  bodyRef?: RefObject<HTMLDivElement | null>;
  onBodyChange?: (html: string) => void;
}

export function DocumentPreview({
  azienda,
  formData,
  tipo,
  scale = 0.75,
  editableBody = false,
  bodyRef,
  onBodyChange,
}: DocumentPreviewProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    setLogoFailed(false);
  }, [azienda?.logo]);

  if (!azienda) return null;

  const titoloReferente = azienda.firmatario?.genere === 'F' ? 'dott.ssa' : 'dott.';
  const cessionario = CESSIONARI_POSSIBILI.find((c) => c.id === formData.cessionarioId);

  const earnoutClause =
    formData.corrispettivoTipo === 'earnout'
      ? ` Nella sola ipotesi in cui venga incassato dal Cessionario entro il ${formatDateItalian(formData.earnoutScadenza)} un riparto concorsuale di importo pari o superiore a Euro ${formatEuro(formData.earnoutSoglia)} (${formData.earnoutSogliaLettere || '___'}), il Cessionario corrisponderà alla Cedente ulteriori Euro ${formatEuro(formData.earnoutImporto)} (${formData.earnoutImportoLettere || '___'}) a titolo di corrispettivo aggiuntivo. Resta espressamente inteso che ove l'incasso dal riparto non pervenisse entro il termine sopra descritto o fosse inferiore all'importo sopra menzionato, alla Cedente non spetterà e non verrà corrisposto alcun corrispettivo aggiuntivo.`
      : '';

  // Quarto bullet "sull'assunto che": opzionale, scompare del tutto se non selezionato.
  const assuntoExtraTesto =
    formData.assuntoExtraTipo === 'concordato'
      ? `i Crediti siano validamente e definitivamente iscritti nell'elenco dei creditori del concordato preventivo n. ${formData.concordatoNumero || '___'}, avanti al Tribunale di ${formData.concordatoTribunale || '___'}, per un importo non inferiore a Euro ${formatEuro(formData.concordatoImporto)}`
      : formData.assuntoExtraTipo === 'ipotecario'
        ? `le garanzie ipotecarie relative alle ragioni di credito sono esistenti, di ${formData.ipotecarioGrado || '___'}, validamente iscritte e rinnovate, con garanzia della continuità delle annotazioni/trascrizioni`
        : formData.assuntoExtraTipo === 'libero'
          ? formData.assuntoExtraLibero
          : '';
  const assuntoExtraBullet = assuntoExtraTesto ? `- ${assuntoExtraTesto};\n\n` : '';

  const isTemplateVuoto = azienda.id === 'template-vuoto';
  const mittenteNome = isTemplateVuoto ? formData.mittenteNome || '[mittente]' : azienda.nome;
  // Finanziamento a favore del mittente per Template Vuoto e SIA LaVita (che chiede a sé stessa).
  const financingToSender = isTemplateVuoto || azienda.id === 'sia-lavita';
  const beneficiario = financingToSender
    ? mittenteNome
    : formData.destinatarioNome || '[destinatario]';
  const firmaHeading =
    (formData.firmaIntestazione || '').trim() ||
    (isTemplateVuoto ? formData.mittenteNome || ' ' : azienda.nome);

  const vars = {
    DESTINATARIO: formData.destinatarioNome || '[destinatario]',
    BENEFICIARIO: beneficiario,
    IMPORTO: formatEuro(formData.importo),
    IMPORTO_LETTERE: formData.importoLettere || '___',
    SCADENZA: formData.scadenza || '31 dicembre 2026',
    EROGAZIONE: formData.conErogazione
      ? `Erogazione:\til finanziamento sarà reso disponibile in un'unica soluzione a mezzo bonifico bancario su conto corrente intestato a ${beneficiario};\n\n`
      : '',
    TASSO: formData.tasso || '10',
    DESTINATARIO_CF: formData.destinatarioCF || '___',
    IMPORTO_CREDITO: formatEuro(formData.importoCredito),
    IMPORTO_CREDITO_LETTERE: formData.importoCredito
      ? importoInLettere(formData.importoCredito)
      : '___',
    DATA_SITUAZIONE: formatDateItalian(formData.dataSituazione),
    MITTENTE: mittenteNome,
    CESSIONARIO: cessionario?.nome || '[cessionario]',
    CESSIONARIO_SEDE: cessionario
      ? `${cessionario.citta} (${cessionario.provincia}), ${cessionario.via}`
      : '___',
    CESSIONARIO_CF: cessionario?.cf || '___',
    DEBITORE: formData.debitore || '[debitore]',
    NDG: formData.ndg ? `, NDG ${formData.ndg}` : '',
    ASSUNTO_EXTRA_BULLET: assuntoExtraBullet,
    IMPORTO_CREDITI: formatEuro(formData.importoCrediti),
    IMPORTO_CREDITI_LETTERE: formData.importoCreditiLettere || '___',
    CORRISPETTIVO: formatEuro(formData.corrispettivo),
    CORRISPETTIVO_LETTERE: formData.corrispettivoLettere || '___',
    EARNOUT_CLAUSE: earnoutClause,
    MASTER_SERVICER: formData.masterServicer || '[master servicer]',
    SCADENZA_OFFERTA: formatDateItalian(formData.scadenzaOfferta),
    MITTENTE_PEC: azienda.pec || '___',
    REFERENTE: azienda.firmatario ? `${titoloReferente} ${azienda.firmatario.nome}` : '___',
    REFERENTE_EMAIL: azienda.firmatario?.email || '___',
  };

  const preview = Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, String(v ?? '')),
    formData.testo || '',
  );

  // 'Altro' non ha una forma giuridica standard in italiano: usiamo il maschile
  // come fallback per il testo del documento (la scelta serve solo per l'easter egg).
  const isFemmina = formData.legaleGenere === 'F';
  const sottoscrittoLabel = isFemmina ? 'La sottoscritta' : 'Il sottoscritto';

  const bodyStyle = {
    fontFamily: "'Calibri', 'Carlito', Arial, sans-serif",
    fontSize: '10pt',
    lineHeight: '1.6',
    color: '#000',
  };
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const COL_W = 220;

  // The sheet's unscaled height, watched rather than assumed: the body grows
  // as the letter is typed, and the wrapper below reserves space from this.
  const foglioRef = useRef<HTMLDivElement>(null);
  const [altezzaFoglio, setAltezzaFoglio] = useState(PAGE_H);
  useEffect(() => {
    const el = foglioRef.current;
    if (!el) return;
    // offsetHeight, not the observer's contentRect: the latter reports the
    // box AFTER the transform on some engines, which would feed the scale
    // back into itself and creep on every zoom step.
    const misura = () => setAltezzaFoglio(el.offsetHeight);
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderBlocks = (text: string) =>
    parseBlocks(text).map((block, i) => {
      if (block.type === 'tab') {
        return (
          <div key={i} style={{ display: 'flex', marginBottom: 10, alignItems: 'flex-start' }}>
            <div style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, paddingRight: 16 }}>
              {block.label}
            </div>
            <div style={{ flex: 1, textAlign: 'justify' }}>{block.body}</div>
          </div>
        );
      }
      if (block.type === 'empty') return <div key={i} style={{ height: 10 }} />;
      return (
        <div key={i} style={{ marginBottom: 10, textAlign: 'justify' }}>
          {block.lines.join(' ')}
        </div>
      );
    });

  // The zoom is a transform, and a transform changes what you SEE without
  // changing the space the element reserves. Left to itself that breaks twice:
  // below 100% the page leaves a gap under it, and above 100% it spills over
  // the panel's left edge into territory no scrollbar can reach, because
  // overflow to the left is never scrollable.
  //
  // So the sheet is wrapped in a box that reserves the page's REAL on-screen
  // size, and the sheet scales from its top-left corner inside it. The wrapper
  // is then an ordinary block of the right width, which `margin-inline: auto`
  // centres while it fits and leaves flush left once it does not.
  //
  // The height is measured rather than assumed: a long letter runs past A4,
  // and a wrapper fixed at one page would cut the overflow off the bottom.
  return (
    <div className="carta-foglio" style={{ width: PAGE_W * scale, height: altezzaFoglio * scale }}>
      <div
        ref={foglioRef}
        className="printable"
        style={{
          width: PAGE_W,
          minHeight: PAGE_H,
          background: 'white',
          boxShadow: '0 4px 32px rgba(0,0,0,0.22)',
          position: 'relative',
          overflow: 'hidden',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        <style>{`
        .lettera-corpo-edit p { margin: 0 0 10px; }
        .lettera-corpo-edit ul, .lettera-corpo-edit ol { margin: 0 0 10px; padding-left: 26px; }
        .lettera-corpo-edit h1 { font-size: 16pt; font-weight: 700; margin: 0 0 8px; }
        .lettera-corpo-edit h2 { font-size: 14pt; font-weight: 700; margin: 0 0 8px; }
        .lettera-corpo-edit h3 { font-size: 12pt; font-weight: 700; margin: 0 0 8px; }
        .lettera-corpo-edit:focus { outline: none; }
        .lettera-corpo-edit:has(> p:only-child:empty)::before,
        .lettera-corpo-edit:has(> p:only-child > br:only-child)::before {
          content: attr(data-placeholder);
          color: #b4b4b4;
          pointer-events: none;
        }
      `}</style>

        {/* HEADER */}
        {azienda.headerSpeciale ? (
          <div
            style={{
              padding: '14px 56px 10px',
              borderBottom: '1.5px solid #a0a0a0',
              fontFamily: "'Calibri', 'Carlito', Arial, sans-serif",
              fontSize: '8pt',
            }}
          >
            <div style={{ fontSize: '10.5pt', fontWeight: 700 }}>{azienda.nomeHeader}</div>
            <div style={{ marginBottom: 6 }}>{azienda.headerSpeciale.sottotitolo}</div>
            {azienda.headerSpeciale.righe.map(([left, right], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{left}</span>
                <span>{right}</span>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '18px 56px 12px',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 80,
            }}
          >
            {azienda.logo && !logoFailed ? (
              <img
                src={azienda.logo}
                alt={azienda.nome}
                style={{ maxHeight: 95, maxWidth: 220, objectFit: 'contain' }}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span
                style={{
                  fontFamily: 'Cambria, Georgia, serif',
                  fontSize: `${azienda.headerSize || 14}pt`,
                  color: azienda.headerColor || '#A6A6A6',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                {azienda.nomeHeader}
              </span>
            )}
          </div>
        )}

        {/* BODY */}
        <div style={{ padding: '44px 56px 100px', ...bodyStyle }}>
          {/* Address block */}
          <div style={{ marginBottom: 24, paddingLeft: '55%' }}>
            <div style={{ marginBottom: 2 }}>Spettabile</div>
            <div style={{ fontWeight: 700, marginBottom: 1 }}>
              {formData.destinatarioNome || <em style={{ color: '#aaa' }}>Nome azienda</em>}
            </div>
            {formData.destinatarioVia && <div>{formData.destinatarioVia}</div>}
            {(formData.destinatarioCap || formData.destinatarioCitta) && (
              <div>
                {[formData.destinatarioCap, formData.destinatarioCitta].filter(Boolean).join(' ')}
              </div>
            )}
            {tipo === 'acquisto' && formData.destinatarioReferente && (
              <div style={{ marginTop: 4 }}>
                Alla cortese attenzione di {formData.destinatarioReferente}
              </div>
            )}
            {formData.destinatarioPec && (
              <div style={{ marginTop: 4 }}>
                <span>Pec: </span>
                <span style={{ color: '#1155CC', textDecoration: 'underline' }}>
                  {formData.destinatarioPec}
                </span>
              </div>
            )}
          </div>

          {/* City + Date */}
          <div style={{ marginBottom: 16 }}>
            {azienda.cittaData || azienda.citta || 'Milano'}, {formatDateItalian(formData.data)}
          </div>

          {/* Oggetto */}
          {formData.oggetto && (
            <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 16 }}>
              Oggetto: {formData.oggetto}
            </div>
          )}

          {/* Apertura */}
          <div style={{ marginBottom: 12 }}>{formData.apertura || 'Egregi Signori,'}</div>

          {/* Corpo */}
          <div style={{ marginBottom: 20 }}>
            {editableBody && onBodyChange ? (
              <EditableHtml
                ref={bodyRef}
                value={formData.testo}
                onChange={onBodyChange}
                placeholder="Scrivi qui il corpo della lettera…"
                className="lettera-corpo-edit"
                style={{ outline: 'none', minHeight: 140, ...bodyStyle }}
              />
            ) : isHtml(preview) ? (
              <div className="quoted-html-body" dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              renderBlocks(preview)
            )}
          </div>

          {/* ── ACCETTAZIONE: sezione citazione proposta ── */}
          {tipo === 'accettazione' && formData.testoPropostaOriginale && (
            <>
              {/* Separator row of asterisks */}
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: 16,
                  letterSpacing: '0.5em',
                  color: '#555',
                }}
              >
                * * *
              </div>

              {/* Quoted proposal: solo il testo formattato del documento caricato/scritto,
                senza alcuna intestazione fabbricata — Spettabile/data/Oggetto originali
                sono già dentro il testo stesso (presi dal documento reale). */}
              <div
                className="quoted-html-body"
                style={{ marginBottom: 16 }}
                dangerouslySetInnerHTML={{ __html: formData.testoPropostaOriginale }}
              />

              {/* Second separator */}
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: 16,
                  letterSpacing: '0.5em',
                  color: '#555',
                }}
              >
                * * *
              </div>
            </>
          )}

          {/* ── RINUNCIA: dichiarazione di rinuncia al credito ── */}
          {tipo === 'rinuncia' && (
            <>
              <div style={{ marginBottom: 12, textAlign: 'center' }}>dichiaro</div>
              <div style={{ marginBottom: 20, textAlign: 'justify' }}>
                di avere irrevocabilmente ed incondizionatamente rinunciato al rimborso del Credito
                limitatamente all'importo di Euro {formatEuro(formData.importoRinunciato)} (
                {formData.importoRinunciato ? importoInLettere(formData.importoRinunciato) : '___'}
                ). L'importo del Credito rinunciato è stato conseguentemente acquisito al patrimonio
                netto della Società quale riserva in conto futuro aumento di capitale sociale per
                gli utilizzi consentiti dalla legge.
              </div>
            </>
          )}

          {/* Chiusura */}
          <div style={{ marginBottom: 48 }}>{formData.chiusura}</div>

          {/* Signature — unica logica per tutti i tipi: assente / 1 colonna / 2 colonne */}
          {formData.firmaSenza ? null : formData.numFirmatari === 2 ? (
            <div>
              <div style={{ fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>
                {firmaHeading}
              </div>
              <div style={{ display: 'flex', gap: 40 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      borderTop: '1px solid #aaa',
                      paddingTop: 4,
                      color: '#666',
                      fontSize: '9pt',
                    }}
                  >
                    _________________________
                  </div>
                  <div style={{ marginTop: 4 }}>{formData.firmatario1Nome}</div>
                  <div style={{ fontStyle: 'italic' }}>{formData.firmatario1Carica}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      borderTop: '1px solid #aaa',
                      paddingTop: 4,
                      color: '#666',
                      fontSize: '9pt',
                    }}
                  >
                    _________________________
                  </div>
                  <div style={{ marginTop: 4 }}>{formData.firmatario2Nome}</div>
                  <div style={{ fontStyle: 'italic' }}>{formData.firmatario2Carica}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ paddingLeft: '55%' }}>
              <div style={{ fontWeight: 700, marginBottom: 40 }}>{firmaHeading}</div>
              <div
                style={{
                  borderTop: '1px solid #aaa',
                  paddingTop: 4,
                  width: 180,
                  color: '#666',
                  fontSize: '9pt',
                }}
              >
                _________________________
              </div>
              {formData.firmatario1Nome && (
                <div style={{ marginTop: 4 }}>{formData.firmatario1Nome}</div>
              )}
              {formData.firmatario1Carica && (
                <div style={{ fontStyle: 'italic' }}>{formData.firmatario1Carica}</div>
              )}
            </div>
          )}

          {/* ── RINUNCIA: dichiarazione sostitutiva di atto notorio ── */}
          {tipo === 'rinuncia' && (
            <div style={{ marginTop: 40 }}>
              <div style={{ fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                DICHIARAZIONE SOSTITUTIVA DI ATTO DI NOTORIETÀ
              </div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                (ex art. 47 D.P.R. 445/2000)
              </div>
              <div style={{ marginBottom: 12, textAlign: 'justify' }}>
                {sottoscrittoLabel} {formData.legaleNome || '___________'}, in qualità di{' '}
                {formData.legaleCarica || 'legale rappresentante'} di {azienda.nome}, consapevole
                delle sanzioni penali in caso di dichiarazioni mendaci, di formazione o uso di atti
                falsi (art. 76, D.P.R. 445/2000), viste le disposizioni di cui all'art. 88, comma
                4-bis del D.P.R. 917/1986
              </div>
              <div style={{ marginBottom: 12, textAlign: 'center' }}>dichiara</div>
              <div style={{ marginBottom: 40, textAlign: 'justify' }}>
                che il valore fiscale del credito vantato verso la società{' '}
                {formData.destinatarioNome || '[destinatario]'} (C.F.{' '}
                {formData.destinatarioCF || '___'}), oggetto di rinuncia come da dichiarazione sopra
                riportata, è pari a € {formatEuro(formData.valoreFiscale)}.
              </div>
              {/* The declaration is signed by whoever makes it, who need not
                  be the person who signed the letter above — the two blocks
                  are deliberately independent. */}
              <div style={{ paddingLeft: '55%' }}>
                <div style={{ fontWeight: 700, marginBottom: 40 }}>{azienda.nome}</div>
                <div
                  style={{
                    borderTop: '1px solid #aaa',
                    paddingTop: 4,
                    width: 180,
                    color: '#666',
                    fontSize: '9pt',
                  }}
                >
                  _________________________
                </div>
                {formData.legaleNome ? (
                  <div style={{ width: 180 }}>
                    <div>{formData.legaleNome}</div>
                    {formData.legaleCarica ? (
                      <div style={{ fontSize: '9pt' }}>{formData.legaleCarica}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {azienda.footerText && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '0 56px 12px',
              borderTop: '1px solid #000',
            }}
          >
            <div
              style={{
                fontFamily: 'Garamond, "EB Garamond", Georgia, serif',
                fontSize: '7.5pt',
                textAlign: 'center',
                color: '#000',
                marginTop: 6,
              }}
            >
              {azienda.footerText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
