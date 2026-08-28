// Word generation for the letterhead view. Ported from the standalone
// generator with the PDF path removed: that one posted the .docx to a local
// Node server which shelled out to LibreOffice, which would mean carrying
// LibreOffice inside the Cloud Run image — half a gigabyte, and a memory
// floor four times the current one on EVERY dashboard request, since there is
// only one service. Word generation is entirely client-side and needs none of
// it.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  BorderStyle,
  ImageRun,
  TabStopType,
  UnderlineType,
} from 'docx';
import { importoInLettere } from './numeroInLettere.js';
export { isHtml } from './format.js';
import { CESSIONARI_POSSIBILI, type Azienda, type Firmatario } from '../data/aziende.js';
import type { DocumentoInput } from '../types.js';
import { formatDateItalian, formatEuro, isHtml } from './format.js';

/** Inline formatting carried down the DOM while walking a rich-text body. */
interface InlineFmt {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: Highlight;
  font?: string;
  color?: string;
  size?: number;
}

interface CollectedRun extends InlineFmt {
  text: string;
}

async function fetchImageAsUint8Array(url: string) {
  // Use absolute URL to avoid issues in production builds
  const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const response = await fetch(absoluteUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${absoluteUrl}`);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Massima "bounding box" del logo in intestazione (px @ 96dpi, stessa unità usata da ImageRun).
const LOGO_MAX_W = 220;
const LOGO_MAX_H = 95;

// Calcola le dimensioni che mantengono le proporzioni originali del logo
// entro il riquadro massimo consentito (equivalente a CSS object-fit: contain).
function fitContain(naturalW: number, naturalH: number, maxW: number, maxH: number) {
  if (!naturalW || !naturalH) return { width: maxW, height: maxH };
  const scale = Math.min(maxW / naturalW, maxH / naturalH);
  return { width: Math.round(naturalW * scale), height: Math.round(naturalH * scale) };
}

function applyPlaceholders(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v || ''), text);
}

function emptyLine() {
  return new Paragraph({
    children: [new TextRun({ text: '', font: 'Calibri Light', size: 20 })],
    spacing: { after: 0 },
  });
}

/** The two option bags a paragraph helper accepts: one forwarded to the run,
 *  one to the paragraph. Declared rather than a loose Record, so a typo in a
 *  caller is caught instead of silently ignored by docx. */
interface ParagraphExtra {
  run?: Record<string, unknown>;
  paragraph?: Record<string, unknown>;
}

function textRun(text: string, extra: Record<string, unknown> = {}) {
  return new TextRun({ text, font: 'Calibri Light', size: 20, ...extra });
}

function paragraph(text: string, extra: ParagraphExtra = {}) {
  return new Paragraph({
    children: [textRun(text, extra.run)],
    spacing: { after: 0 },
    ...extra.paragraph,
  });
}

/** One block of the plain-text body: a run of lines, a blank line, or a
 *  label/value pair split on a tab. A discriminated union so the renderer
 *  below cannot read `.label` off a block that has none. */
type TextBlock =
  | { type: 'text'; lines: string[] }
  | { type: 'tab'; label: string; body: string }
  | { type: 'empty' };

// Converte testo multiriga in Paragraphs Word.
function textToParagraphs(text: string) {
  if (!text) return [];
  const blocks: TextBlock[] = [];
  let buf: string[] = [];
  text.split('\n').forEach((line) => {
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
      blocks.push({ type: 'empty' });
    } else {
      buf.push(line);
    }
  });
  if (buf.length) blocks.push({ type: 'text', lines: buf });

  const TAB_POS = 3400;

  return blocks.map((block) => {
    if (block.type === 'empty') return emptyLine();
    if (block.type === 'tab') {
      return new Paragraph({
        children: [
          new TextRun({ text: block.label, font: 'Calibri Light', size: 20 }),
          new TextRun({ text: '\t', font: 'Calibri Light', size: 20 }),
          new TextRun({ text: block.body, font: 'Calibri Light', size: 20 }),
        ],
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        tabStops: [{ type: TabStopType.LEFT, position: TAB_POS }],
        indent: { left: TAB_POS, hanging: TAB_POS },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: block.lines.join(' '), font: 'Calibri Light', size: 20 })],
      spacing: { after: 160 },
      alignment: AlignmentType.JUSTIFIED,
    });
  });
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);
const HEADING_HALFPT: Record<string, number> = { H1: 32, H2: 28, H3: 24, H4: 22 };
/** docx accepts a closed set of highlight names, so this maps to that union
 *  rather than to `string`: a colour the library does not know would be
 *  rejected at runtime with no useful message. */
type Highlight = 'yellow' | 'green' | 'cyan' | 'magenta' | 'lightGray' | 'red' | 'blue';

const HEX_TO_HIGHLIGHT: Record<string, Highlight> = {
  FFFF00: 'yellow',
  '92D050': 'green',
  '00FF00': 'green',
  '00FFFF': 'cyan',
  FF99CC: 'magenta',
  FF00FF: 'magenta',
  D9D9D9: 'lightGray',
  FF0000: 'red',
  '0000FF': 'blue',
};

function rgbToHex(c: string): string | null {
  if (!c) return null;
  c = c.trim();
  if (c.startsWith('#')) {
    if (c.length === 4) return `${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toUpperCase();
    return c.slice(1, 7).toUpperCase();
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  return [m[1], m[2], m[3]]
    .map((n) =>
      Number(n ?? 0)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();
}

function fontSizeHalfPt(style: string) {
  const m = style.match(/font-size:\s*([\d.]+)(pt|px)/);
  if (!m) return null;
  const valore = parseFloat(m[1] ?? '0');
  const pt = m[2] === 'px' ? valore * 0.75 : valore;
  return Math.round(pt * 2);
}

// Cammina i nodi inline di un blocco HTML raccogliendo segmenti di testo con i
// formati ereditati dai tag/stili antenati (grassetto, corsivo, sottolineato,
// barrato, colore, evidenziatore, dimensione e famiglia del carattere).
function collectInlineRuns(node: Node, fmt: InlineFmt, runs: CollectedRun[]) {
  // The walk visits Nodes but reads Element members; narrowing once here is
  // clearer than casting at each of the dozen uses below.
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) runs.push({ text: node.textContent, ...fmt });
    return;
  }
  if (!el) return;
  if (el.tagName === 'BR') {
    runs.push({ text: '\n', ...fmt });
    return;
  }
  const next = { ...fmt };
  const tag = el.tagName;
  if (tag === 'STRONG' || tag === 'B') next.bold = true;
  if (tag === 'EM' || tag === 'I') next.italics = true;
  if (tag === 'U') next.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.strike = true;
  const style = el.getAttribute('style') ?? '';
  if (style) {
    if (/font-weight:\s*(bold|[6-9]00)/.test(style)) next.bold = true;
    if (/font-style:\s*italic/.test(style)) next.italics = true;
    if (/text-decoration[^;]*underline/.test(style)) next.underline = true;
    if (/text-decoration[^;]*line-through/.test(style)) next.strike = true;
    const colorM = style.match(/(?:^|;)\s*color:\s*([^;]+)/);
    if (colorM) {
      const hex = rgbToHex(colorM[1] ?? '');
      if (hex) next.color = hex;
    }
    const bgM = style.match(/background(?:-color)?:\s*([^;]+)/);
    if (bgM) {
      const hex = rgbToHex(bgM[1] ?? '');
      if (hex) next.highlight = HEX_TO_HIGHLIGHT[hex] ?? 'yellow';
    }
    const sz = fontSizeHalfPt(style);
    if (sz) next.size = sz;
    const fam = style.match(/font-family:\s*([^;]+)/);
    if (fam?.[1]) next.font = (fam[1].replace(/["']/g, '').split(',')[0] ?? '').trim();
  }
  el.childNodes.forEach((child) => collectInlineRuns(child, next, runs));
}

// Trasforma i segmenti raccolti in TextRun, spezzando i '\n' (BR) in interruzioni
// di riga e applicando i default (Calibri Light 10pt) dove non c'è override.
function buildRuns(prefix: string, collected: CollectedRun[], headingHalfPt?: number) {
  const segs = collected.filter((r) => r.text);
  const out: TextRun[] = [];
  if (!segs.length)
    return prefix
      ? [
          new TextRun({
            text: prefix,
            font: 'Calibri Light',
            size: headingHalfPt || 20,
            bold: !!headingHalfPt,
          }),
        ]
      : [];
  segs.forEach((r, i) => {
    const lines = r.text.split('\n');
    lines.forEach((line, li) => {
      out.push(
        new TextRun({
          text: (i === 0 && li === 0 ? prefix : '') + line,
          break: li > 0 ? 1 : undefined,
          font: r.font || 'Calibri Light',
          size: r.size || headingHalfPt || 20,
          bold: r.bold || !!headingHalfPt || undefined,
          italics: r.italics || undefined,
          underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
          strike: r.strike || undefined,
          color: r.color || undefined,
          highlight: r.highlight || undefined,
        }),
      );
    });
  });
  return out;
}

const CSS_ALIGN_TO_DOCX: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  right: AlignmentType.RIGHT,
  center: AlignmentType.CENTER,
  justify: AlignmentType.JUSTIFIED,
};

// Allineamento, rientri e interlinea dallo style inline del blocco (1px = 15 twip).
function blockFormat(
  el: Element,
  defaultAlign: (typeof AlignmentType)[keyof typeof AlignmentType],
) {
  const style = el.getAttribute('style') || '';
  const num = (prop: string): number => {
    const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?[\\d.]+)px`));
    return m?.[1] ? parseFloat(m[1]) : 0;
  };
  const alignM = style.match(/text-align\s*:\s*(\w+)/);
  const alignment = (alignM?.[1] ? CSS_ALIGN_TO_DOCX[alignM[1]] : undefined) ?? defaultAlign;

  const left = num('padding-left') || num('margin-left');
  const right = num('padding-right') || num('margin-right');
  const textIndent = num('text-indent');
  const indent: { left?: number; right?: number; firstLine?: number; hanging?: number } = {};
  if (left) indent.left = Math.round(left * 15);
  if (right) indent.right = Math.round(right * 15);
  if (textIndent > 0) indent.firstLine = Math.round(textIndent * 15);
  else if (textIndent < 0) indent.hanging = Math.round(-textIndent * 15);

  const spacing: { after: number; line?: number; lineRule?: 'auto' | 'exact' | 'atLeast' } = {
    after: 160,
  };
  const lh = style.match(/line-height:\s*([\d.]+)\s*(?:;|$)/);
  if (lh) {
    spacing.line = Math.round(parseFloat(lh[1] ?? '0') * 240);
    spacing.lineRule = 'auto';
  }

  return { alignment, indent: Object.keys(indent).length ? indent : undefined, spacing };
}

// Converte l'HTML (corpo lettera o proposta caricata) in Paragraph/TextRun Word,
// preservando formattazione inline, allineamenti, rientri, elenchi e titoli.
function htmlToDocxParagraphs(
  html: string,
  {
    defaultAlign = AlignmentType.JUSTIFIED,
  }: { defaultAlign?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
) {
  if (!html) return [];
  const dom = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, 'text/html');
  const paragraphs: Paragraph[] = [];

  const walkList = (listEl: Element, ordered: boolean, depth: number): void => {
    let idx = 1;
    Array.from(listEl.children).forEach((li) => {
      if (li.tagName !== 'LI') return;
      const runs: CollectedRun[] = [];
      li.childNodes.forEach((ch) => {
        const child = ch.nodeType === Node.ELEMENT_NODE ? (ch as Element) : null;
        if (child && (child.tagName === 'UL' || child.tagName === 'OL')) return;
        collectInlineRuns(ch, {}, runs);
      });
      const fmt = blockFormat(li, AlignmentType.LEFT);
      paragraphs.push(
        new Paragraph({
          children: buildRuns(ordered ? `${idx}.  ` : '•  ', runs),
          alignment: fmt.alignment,
          indent: { left: 360 + depth * 360, hanging: 360, ...(fmt.indent || {}) },
          spacing: fmt.spacing,
        }),
      );
      idx++;
      li.childNodes.forEach((ch) => {
        const nested = ch.nodeType === Node.ELEMENT_NODE ? (ch as Element) : null;
        if (nested && (nested.tagName === 'UL' || nested.tagName === 'OL')) {
          walkList(nested, nested.tagName === 'OL', depth + 1);
        }
      });
    });
  };

  const walk = (parent: Element): void => {
    Array.from(parent.children).forEach((el) => {
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        walkList(el, el.tagName === 'OL', 0);
        return;
      }
      if (!BLOCK_TAGS.has(el.tagName)) {
        if (el.querySelector && el.querySelector('p,div,ul,ol,h1,h2,h3,h4,blockquote,li')) walk(el);
        return;
      }
      const hasNestedBlock = Array.from(el.children).some(
        (c) => BLOCK_TAGS.has(c.tagName) || c.tagName === 'UL' || c.tagName === 'OL',
      );
      if (hasNestedBlock) {
        walk(el);
        return;
      }
      const runs: CollectedRun[] = [];
      collectInlineRuns(el, {}, runs);
      const headingHalfPt = HEADING_HALFPT[el.tagName];
      const hasText = runs.some((r) => r.text.trim());
      if (!hasText && !headingHalfPt) {
        paragraphs.push(emptyLine());
        return;
      }
      const fmt = blockFormat(el, defaultAlign);
      paragraphs.push(
        new Paragraph({
          children: buildRuns('', runs, headingHalfPt),
          alignment: fmt.alignment,
          indent: fmt.indent,
          spacing: headingHalfPt ? { before: 80, after: 120 } : fmt.spacing,
        }),
      );
    });
  };
  walk(dom.body);
  return paragraphs.length ? paragraphs : [emptyLine()];
}

// Build address block (indented to right)
function buildAddressBlock(formData: DocumentoInput) {
  const INDENT = { left: 6663, right: -7 };
  const TAB = [{ type: TabStopType.LEFT, position: 8647 }];
  const rows = [
    new Paragraph({
      children: [new TextRun({ text: 'Spettabile', font: 'Calibri Light', size: 20 })],
      indent: INDENT,
      tabStops: TAB,
      spacing: { after: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: formData.destinatarioNome || '',
          font: 'Calibri Light',
          size: 20,
          bold: true,
        }),
      ],
      indent: INDENT,
      tabStops: TAB,
      spacing: { after: 0 },
    }),
  ];
  if (formData.destinatarioVia)
    rows.push(
      new Paragraph({
        children: [
          new TextRun({ text: formData.destinatarioVia, font: 'Calibri Light', size: 20 }),
        ],
        indent: INDENT,
        tabStops: TAB,
        spacing: { after: 0 },
      }),
    );
  if (formData.destinatarioCap || formData.destinatarioCitta) {
    rows.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [formData.destinatarioCap, formData.destinatarioCitta].filter(Boolean).join(' '),
            font: 'Calibri Light',
            size: 20,
          }),
        ],
        indent: INDENT,
        tabStops: TAB,
        spacing: { after: 0 },
      }),
    );
  }
  if (formData.tipo === 'acquisto' && formData.destinatarioReferente) {
    rows.push(
      new Paragraph({
        children: [new TextRun({ text: '', font: 'Calibri Light', size: 20 })],
        indent: INDENT,
        tabStops: TAB,
        spacing: { after: 0 },
      }),
    );
    rows.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Alla cortese attenzione di ${formData.destinatarioReferente}`,
            font: 'Calibri Light',
            size: 20,
          }),
        ],
        indent: INDENT,
        tabStops: TAB,
        spacing: { after: 0 },
      }),
    );
  }
  rows.push(
    new Paragraph({
      children: [new TextRun({ text: '', font: 'Calibri Light', size: 20 })],
      indent: INDENT,
      tabStops: TAB,
      spacing: { after: 0 },
    }),
  );
  if (formData.destinatarioPec) {
    rows.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Pec: ', font: 'Calibri Light', size: 20 }),
          new TextRun({ text: formData.destinatarioPec, font: 'Calibri Light', size: 20 }),
        ],
        indent: INDENT,
        tabStops: TAB,
        spacing: { after: 0 },
      }),
    );
  }
  rows.push(emptyLine(), emptyLine());
  return rows;
}

// Intestazione speciale a due colonne (Frigo Sud): titolo in grassetto,
// sottotitolo, righe sinistra/destra con tab centrale+destro e riga grigia
// finale — fedele al documento originale "Aggiornamento canone copia.docx".
function buildFrigoHeaderParagraphs(azienda: Azienda) {
  const hs = azienda.headerSpeciale;
  const tabStops = [
    { type: TabStopType.CENTER, position: 4819 },
    { type: TabStopType.RIGHT, position: 9638 },
  ];
  if (!hs) return [];
  const righe = hs.righe.map(
    ([left, right], i) =>
      new Paragraph({
        tabStops,
        border:
          i === hs.righe.length - 1
            ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'A0A0A0', space: 4 } }
            : undefined,
        children: [
          new TextRun({ text: left, font: 'Calibri Light', size: 16 }),
          new TextRun({ text: '\t\t', font: 'Calibri Light', size: 16 }),
          new TextRun({ text: right, font: 'Calibri Light', size: 16 }),
        ],
        spacing: { after: 0 },
      }),
  );
  return [
    new Paragraph({
      children: [
        new TextRun({ text: azienda.nomeHeader, font: 'Calibri Light', size: 21, bold: true }),
      ],
      spacing: { after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: hs.sottotitolo, font: 'Calibri Light', size: 16 })],
      spacing: { after: 80 },
    }),
    ...righe,
  ];
}

function buildSignatureBlock(nome: string, firmatario: Firmatario | undefined) {
  const blocks = [
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: nome, font: 'Calibri Light', size: 20, bold: true })],
      indent: { left: 6663 },
      spacing: { after: 0 },
    }),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    new Paragraph({
      children: [
        new TextRun({ text: '_________________________', font: 'Calibri Light', size: 20 }),
      ],
      indent: { left: 6663 },
      spacing: { after: 0 },
    }),
  ];
  if (firmatario?.nome) {
    blocks.push(
      new Paragraph({
        children: [new TextRun({ text: firmatario.nome, font: 'Calibri Light', size: 20 })],
        indent: { left: 6663 },
        spacing: { after: 0 },
      }),
    );
    if (firmatario.carica) {
      blocks.push(
        new Paragraph({
          children: [
            new TextRun({
              text: firmatario.carica,
              font: 'Calibri Light',
              size: 20,
              italics: true,
            }),
          ],
          indent: { left: 6663 },
          spacing: { after: 0 },
        }),
      );
    }
  }
  return blocks;
}

// Firma a due colonne affiancate (es. acquisto crediti con due firmatari):
// nome azienda centrato sopra, poi due linee di firma/nome/carica appaiate
// con un tab stop a metà larghezza utile, come nei documenti originali.
function buildDualSignatureBlock(nome: string, firmatario1: Firmatario, firmatario2: Firmatario) {
  const COL2 = 4819; // metà della larghezza utile (9638 twip)
  const tabStops = [{ type: TabStopType.LEFT, position: COL2 }];
  const row = (left: string, right: string, extra: Record<string, unknown> = {}) =>
    new Paragraph({
      children: [
        new TextRun({ text: left || '', font: 'Calibri Light', size: 20, ...extra }),
        new TextRun({ text: '\t', font: 'Calibri Light', size: 20 }),
        new TextRun({ text: right || '', font: 'Calibri Light', size: 20, ...extra }),
      ],
      tabStops,
      spacing: { after: 0 },
    });
  return [
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: nome, font: 'Calibri Light', size: 20, bold: true })],
      spacing: { after: 0 },
    }),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    row('_________________________', '_________________________'),
    row(firmatario1?.nome, firmatario2?.nome),
    row(firmatario1?.carica, firmatario2?.carica, { italics: true }),
  ];
}

// ── Costruisce il documento Word (senza scaricarlo) ──
export async function buildDocument(azienda: Azienda, formData: DocumentoInput) {
  const tipo = formData.tipo;

  // ── Logo ──
  let logoData = null;
  let logoW = LOGO_MAX_W,
    logoH = LOGO_MAX_H;
  if (azienda.logo) {
    try {
      logoData = await fetchImageAsUint8Array(azienda.logo);
      const fitted = fitContain(
        azienda.logoWidth ?? 0,
        azienda.logoHeight ?? 0,
        LOGO_MAX_W,
        LOGO_MAX_H,
      );
      logoW = fitted.width;
      logoH = fitted.height;
    } catch (e) {
      console.warn('Logo non caricato:', e);
    }
  }

  const titoloReferente = azienda.firmatario?.genere === 'F' ? 'dott.ssa' : 'dott.';
  const cessionario = CESSIONARI_POSSIBILI.find((c) => c.id === formData.cessionarioId);

  const earnoutClause =
    formData.corrispettivoTipo === 'earnout'
      ? ` Nella sola ipotesi in cui venga incassato dal Cessionario entro il ${formatDateItalian(formData.earnoutScadenza)} un riparto concorsuale di importo pari o superiore a Euro ${formatEuro(formData.earnoutSoglia)} (${formData.earnoutSogliaLettere || ''}), il Cessionario corrisponderà alla Cedente ulteriori Euro ${formatEuro(formData.earnoutImporto)} (${formData.earnoutImportoLettere || ''}) a titolo di corrispettivo aggiuntivo. Resta espressamente inteso che ove l'incasso dal riparto non pervenisse entro il termine sopra descritto o fosse inferiore all'importo sopra menzionato, alla Cedente non spetterà e non verrà corrisposto alcun corrispettivo aggiuntivo.`
      : '';

  const assuntoExtraTesto =
    formData.assuntoExtraTipo === 'concordato'
      ? `i Crediti siano validamente e definitivamente iscritti nell'elenco dei creditori del concordato preventivo n. ${formData.concordatoNumero || ''}, avanti al Tribunale di ${formData.concordatoTribunale || ''}, per un importo non inferiore a Euro ${formatEuro(formData.concordatoImporto)}`
      : formData.assuntoExtraTipo === 'ipotecario'
        ? `le garanzie ipotecarie relative alle ragioni di credito sono esistenti, di ${formData.ipotecarioGrado || ''}, validamente iscritte e rinnovate, con garanzia della continuità delle annotazioni/trascrizioni`
        : formData.assuntoExtraTipo === 'libero'
          ? formData.assuntoExtraLibero
          : '';
  const assuntoExtraBullet = assuntoExtraTesto ? `- ${assuntoExtraTesto};\n\n` : '';

  const isTemplateVuoto = azienda.id === 'template-vuoto';
  const mittenteNome = isTemplateVuoto ? formData.mittenteNome || '' : azienda.nome || '';
  // Finanziamento a favore del mittente per Template Vuoto e SIA LaVita (che chiede a sé stessa).
  const financingToSender = isTemplateVuoto || azienda.id === 'sia-lavita';
  const beneficiario = financingToSender ? mittenteNome : formData.destinatarioNome || '';

  const vars = {
    DESTINATARIO: formData.destinatarioNome || '',
    BENEFICIARIO: beneficiario,
    IMPORTO_LETTERE: formData.importoLettere || '',
    IMPORTO: formatEuro(formData.importo),
    SCADENZA: formData.scadenza || '31 dicembre 2026',
    EROGAZIONE: formData.conErogazione
      ? `Erogazione:\til finanziamento sarà reso disponibile in un'unica soluzione a mezzo bonifico bancario su conto corrente intestato a ${beneficiario};\n\n`
      : '',
    TASSO: formData.tasso || '10',
    DESTINATARIO_CF: formData.destinatarioCF || '',
    IMPORTO_CREDITO: formatEuro(formData.importoCredito),
    IMPORTO_CREDITO_LETTERE: formData.importoCredito
      ? importoInLettere(formData.importoCredito)
      : '',
    DATA_SITUAZIONE: formatDateItalian(formData.dataSituazione),
    MITTENTE: mittenteNome,
    CESSIONARIO: cessionario?.nome || '',
    CESSIONARIO_SEDE: cessionario
      ? `${cessionario.citta} (${cessionario.provincia}), ${cessionario.via}`
      : '',
    CESSIONARIO_CF: cessionario?.cf || '',
    DEBITORE: formData.debitore || '',
    NDG: formData.ndg ? `, NDG ${formData.ndg}` : '',
    ASSUNTO_EXTRA_BULLET: assuntoExtraBullet,
    IMPORTO_CREDITI: formatEuro(formData.importoCrediti),
    IMPORTO_CREDITI_LETTERE: formData.importoCreditiLettere || '',
    CORRISPETTIVO: formatEuro(formData.corrispettivo),
    CORRISPETTIVO_LETTERE: formData.corrispettivoLettere || '',
    EARNOUT_CLAUSE: earnoutClause,
    MASTER_SERVICER: formData.masterServicer || '',
    SCADENZA_OFFERTA: formatDateItalian(formData.scadenzaOfferta),
    MITTENTE_PEC: azienda.pec || '',
    REFERENTE: azienda.firmatario ? `${titoloReferente} ${azienda.firmatario.nome}` : '',
    REFERENTE_EMAIL: azienda.firmatario?.email || '',
  };
  const corpo = applyPlaceholders(formData.testo || '', vars);
  const corpoParagraphs =
    tipo === 'lettera' || isHtml(corpo) ? htmlToDocxParagraphs(corpo) : textToParagraphs(corpo);

  // ── Header ──
  const header = new Header({
    children: azienda.headerSpeciale
      ? buildFrigoHeaderParagraphs(azienda)
      : logoData
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: logoData,
                  transformation: { width: logoW, height: logoH },
                  type: 'png',
                }),
              ],
              spacing: { after: 0 },
            }),
          ]
        : [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: azienda.nomeHeader,
                  font: 'Cambria',
                  size: (azienda.headerSize || 10.5) * 2,
                  color: (azienda.headerColor || '#A6A6A6').replace('#', ''),
                  bold: true,
                }),
              ],
            }),
          ],
  });

  // ── Footer ──
  const footer = azienda.footerText
    ? new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
            spacing: { before: 0, after: 80 },
            children: [],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: azienda.footerText, font: 'Garamond', size: 14 })],
            spacing: { after: 0 },
          }),
        ],
      })
    : new Footer({ children: [] });

  const addressBlock = buildAddressBlock(formData);

  const dateLine = new Paragraph({
    children: [
      new TextRun({
        text: `${azienda.cittaData || azienda.citta || 'Milano'}, `,
        font: 'Calibri Light',
        size: 20,
      }),
      new TextRun({ text: formatDateItalian(formData.data), font: 'Calibri Light', size: 20 }),
    ],
    spacing: { after: 0 },
  });

  const oggettoLine = new Paragraph({
    children: [
      new TextRun({
        text: `Oggetto: ${formData.oggetto || ''}`,
        font: 'Calibri Light',
        size: 20,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
      }),
    ],
    spacing: { after: 0 },
  });

  // ── Build body children ──
  const bodyChildren = [
    emptyLine(),
    ...addressBlock,
    dateLine,
    emptyLine(),
    emptyLine(),
    oggettoLine,
    emptyLine(),
    new Paragraph({
      children: [
        new TextRun({
          text: formData.apertura || 'Egregi Signori,',
          font: 'Calibri Light',
          size: 20,
        }),
      ],
      spacing: { after: 0 },
      alignment: AlignmentType.JUSTIFIED,
    }),
    emptyLine(),
    ...corpoParagraphs,
    emptyLine(),
  ];

  // ── Accettazione: insert quoted proposal ──
  // Solo il testo formattato del documento caricato/scritto: nessuna intestazione
  // fabbricata (Spettabile/data/Oggetto originali sono già nel testo stesso).
  if (tipo === 'accettazione' && formData.testoPropostaOriginale) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '* * *', font: 'Calibri Light', size: 20, characterSpacing: 200 }),
        ],
        spacing: { before: 200, after: 200 },
      }),
    );
    bodyChildren.push(...htmlToDocxParagraphs(formData.testoPropostaOriginale));
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '* * *', font: 'Calibri Light', size: 20, characterSpacing: 200 }),
        ],
        spacing: { before: 200, after: 200 },
      }),
    );
  }

  // ── Rinuncia a crediti: dichiarazione di rinuncia + dichiarazione sostitutiva ──
  if (tipo === 'rinuncia') {
    bodyChildren.push(
      paragraph('dichiaro', { paragraph: { alignment: AlignmentType.CENTER } }),
      emptyLine(),
      new Paragraph({
        children: [
          new TextRun({
            text: `di avere irrevocabilmente ed incondizionatamente rinunciato al rimborso del Credito limitatamente all'importo di Euro ${formatEuro(formData.importoRinunciato)} (${formData.importoRinunciato ? importoInLettere(formData.importoRinunciato) : ''}). L'importo del Credito rinunciato è stato conseguentemente acquisito al patrimonio netto della Società quale riserva in conto futuro aumento di capitale sociale per gli utilizzi consentiti dalla legge.`,
            font: 'Calibri Light',
            size: 20,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 0 },
      }),
      emptyLine(),
    );
  }

  // ── Closing — firma unica per tutti i tipi: assente / 1 firmatario / 2 firmatari ──
  const firmaHeading =
    (formData.firmaIntestazione || '').trim() ||
    (isTemplateVuoto ? formData.mittenteNome || '' : azienda.nome || '');
  // `genere` is irrelevant to a signature line (it drives only the
  // "Il/La sottoscritto/a" wording elsewhere), but Firmatario requires it.
  const firmatario1: Firmatario = {
    nome: formData.firmatario1Nome,
    carica: formData.firmatario1Carica,
    genere: 'M',
  };
  const firmatario2: Firmatario = {
    nome: formData.firmatario2Nome,
    carica: formData.firmatario2Carica,
    genere: 'M',
  };
  let signatureBlocks: Paragraph[];
  if (formData.firmaSenza) {
    signatureBlocks = [];
  } else if (formData.numFirmatari === 2) {
    signatureBlocks = buildDualSignatureBlock(firmaHeading, firmatario1, firmatario2);
  } else {
    signatureBlocks = buildSignatureBlock(firmaHeading, firmatario1);
  }
  bodyChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: formData.chiusura || 'Distinti saluti.',
          font: 'Calibri Light',
          size: 20,
        }),
      ],
      spacing: { after: 0 },
      alignment: AlignmentType.JUSTIFIED,
    }),
    ...signatureBlocks,
  );

  // ── Rinuncia a crediti: dichiarazione sostitutiva di atto notorio (ex art. 47 DPR 445/2000) ──
  if (tipo === 'rinuncia') {
    // 'Altro' non ha una forma giuridica standard in italiano: usiamo il maschile
    // come fallback per il testo del documento (la scelta serve solo per l'easter egg).
    const isFemmina = formData.legaleGenere === 'F';
    const sottoscrittoLabel = isFemmina ? 'La sottoscritta' : 'Il sottoscritto';
    bodyChildren.push(
      emptyLine(),
      emptyLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'DICHIARAZIONE SOSTITUTIVA DI ATTO DI NOTORIETÀ',
            font: 'Calibri Light',
            size: 20,
            bold: true,
          }),
        ],
        spacing: { after: 0 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '(ex art. 47 D.P.R. 445/2000)', font: 'Calibri Light', size: 20 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${sottoscrittoLabel} ${formData.legaleNome || ''}, in qualità di ${formData.legaleCarica || 'legale rappresentante'} di ${azienda.nome}, consapevole delle sanzioni penali in caso di dichiarazioni mendaci, di formazione o uso di atti falsi (art. 76, D.P.R. 445/2000), viste le disposizioni di cui all'art. 88, comma 4-bis del D.P.R. 917/1986`,
            font: 'Calibri Light',
            size: 20,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 0 },
      }),
      emptyLine(),
      paragraph('dichiara', { paragraph: { alignment: AlignmentType.CENTER } }),
      emptyLine(),
      new Paragraph({
        children: [
          new TextRun({
            text: `che il valore fiscale del credito vantato verso la società ${formData.destinatarioNome || ''} (C.F. ${formData.destinatarioCF || ''}), oggetto di rinuncia come da dichiarazione sopra riportata, è pari a € ${formatEuro(formData.valoreFiscale)}.`,
            font: 'Calibri Light',
            size: 20,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 0 },
      }),
      // Named, not a bare line over the company: the declaration is a personal
      // statement under art. 47 D.P.R. 445/2000 ("Il sottoscritto ... dichiara")
      // and the person making it is not necessarily the one who signed the
      // letter above — that is exactly why the two blocks are kept apart.
      ...buildSignatureBlock(azienda.nome ?? '', {
        nome: formData.legaleNome,
        carica: formData.legaleCarica,
        genere: formData.legaleGenere,
      }),
    );
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: bodyChildren,
      },
    ],
  });
}

function buildFilename(azienda: Azienda, formData: DocumentoInput, ext: string): string {
  const tipo = formData.tipo;
  const tipoLabel =
    tipo === 'proposta'
      ? 'proposta'
      : tipo === 'accettazione'
        ? 'accettazione'
        : tipo === 'rinuncia'
          ? 'rinuncia'
          : tipo === 'acquisto'
            ? 'acquisto_crediti'
            : 'lettera';
  const destSlug = (formData.destinatarioNome || 'destinatario')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 20);
  const dateSlug = formData.data ? formData.data.replace(/-/g, '') : 'data';
  return `${tipoLabel}_${azienda.id}_${destSlug}_${dateSlug}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function generateDocx(azienda: Azienda, formData: DocumentoInput): Promise<void> {
  const doc = await buildDocument(azienda, formData);
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, buildFilename(azienda, formData, 'docx'));
}
