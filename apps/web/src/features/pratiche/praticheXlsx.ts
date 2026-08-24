// Real .xlsx for the pratiche register — a zipped OOXML workbook, not a CSV
// with a different extension.
//
// Written by hand rather than pulled from a library, deliberately. The sheet
// is one tab with thirteen columns and three cell types; the candidates cost
// 1.8 MB (write-excel-file) to 21 MB (exceljs) unpacked, and the `xlsx` on npm
// is the stale 0.18.5 SheetJS fork carrying known advisories. All this needs
// is a zip, which `fflate` provides in ~30 KB.
//
// Why a real workbook and not the CSV: the CSV is already tuned for Italian
// Excel (semicolon, BOM, dd/mm/yyyy), but every one of those is a bet on the
// reader's locale settings. A semicolon file opened under an English list
// separator lands every row in one cell. In a workbook the types are declared,
// not guessed — dates are dates and the cost is a number, whatever machine
// opens it.
import { zipSync, strToU8 } from 'fflate';
import type { Pratica, StatoPratica } from '@pvp/shared';

/** Excel counts days from 1899-12-30 — not 1900-01-01 — because its epoch
 *  carries Lotus 1-2-3's non-existent 29 Feb 1900. Computed in UTC so a
 *  browser in a negative offset doesn't shift the day backwards. */
function excelSerial(isoDate: string): number | null {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

/** Drops the control characters XML 1.0 forbids outright — no escaping makes
 *  them legal, and one in a note is enough for Excel to declare the whole file
 *  corrupt. Tab, newline and carriage return are the three that are allowed,
 *  and they survive. Written as a scan rather than a regex so the intent is
 *  visible and ESLint's no-control-regex has nothing to suppress. */
function stripControl(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue;
    out += ch;
  }
  return out;
}

function esc(value: string): string {
  return stripControl(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colName(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Style indexes defined in styles.xml below. */
const S_HEADER = 1;
const S_DATE = 2;
const S_MONEY = 3;

type Cell =
  | { kind: 'text'; value: string }
  | { kind: 'date'; value: string | null }
  | { kind: 'money'; cent: number | null };

const testo = (v: string | null): Cell => ({ kind: 'text', value: v ?? '' });

function cellXml(ref: string, cell: Cell): string {
  if (cell.kind === 'date') {
    const serial = cell.value == null ? null : excelSerial(cell.value);
    // An empty cell still carries the date style, so a value typed into it
    // later formats like its column instead of showing a raw serial.
    if (serial == null) return `<c r="${ref}" s="${S_DATE}"/>`;
    return `<c r="${ref}" s="${S_DATE}"><v>${serial}</v></c>`;
  }
  if (cell.kind === 'money') {
    if (cell.cent == null) return `<c r="${ref}" s="${S_MONEY}"/>`;
    // Cents back to euros only here, at the edge — see the schema's note on
    // why the stored value is an integer.
    return `<c r="${ref}" s="${S_MONEY}"><v>${cell.cent / 100}</v></c>`;
  }
  if (cell.value === '') return `<c r="${ref}"/>`;
  // Inline strings rather than a sharedStrings table: one fewer part to keep
  // consistent, and this register is small enough that the deduplication a
  // shared table buys is worth nothing.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(cell.value)}</t></is></c>`;
}

export const XLSX_HEADERS = [
  'NDG',
  'Numero pratica',
  'Portafoglio',
  'Stato',
  'N. scatole',
  'Data richiesta',
  'Data spedizione',
  'Consegna prevista',
  'Consegna effettiva',
  'Costo spedizione',
  'Note',
  'Ordinata da',
  'Creata il',
] as const;

/** Column widths in Excel's character units — set once here so the file opens
 *  readable instead of showing ### where a date should be. */
const WIDTHS = [18, 16, 16, 14, 12, 14, 14, 16, 16, 16, 40, 16, 18];

function rowCells(
  p: Pratica,
  nomeUtente: (id: string | null) => string,
  statoLabel: (s: StatoPratica) => string,
): Cell[] {
  return [
    testo(p.ndg),
    testo(p.numero_pratica),
    testo(p.portafoglio),
    testo(statoLabel(p.stato)),
    testo(p.n_scatole),
    { kind: 'date', value: p.data_richiesta },
    { kind: 'date', value: p.data_spedizione },
    { kind: 'date', value: p.data_consegna_prevista },
    { kind: 'date', value: p.data_consegna_effettiva },
    { kind: 'money', cent: p.costo_spedizione_cent },
    testo(p.note),
    testo(nomeUtente(p.ordinato_da)),
    { kind: 'date', value: p.created_at.slice(0, 10) },
  ];
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Pratiche" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

// Excel is strict here: `fills` must contain the two built-ins (none, gray125)
// at indexes 0 and 1 or it reports the file as corrupt, however unused they are.
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/**
 * The workbook bytes for exactly the pratiche given — the caller passes the
 * filtered array, so "download" means "what I am looking at", the same
 * guarantee the CSV export carries.
 */
export function praticheToXlsx(
  pratiche: Pratica[],
  nomeUtente: (id: string | null) => string = () => '',
  statoLabel: (s: StatoPratica) => string = (s) => s,
): Uint8Array {
  const header = XLSX_HEADERS.map(
    (h, i) => `<c r="${colName(i)}1" s="${S_HEADER}" t="inlineStr"><is><t>${esc(h)}</t></is></c>`,
  ).join('');

  const body = pratiche
    .map((p, r) => {
      const row = r + 2; // row 1 is the header
      const cells = rowCells(p, nomeUtente, statoLabel)
        .map((c, i) => cellXml(`${colName(i)}${row}`, c))
        .join('');
      return `<row r="${row}">${cells}</row>`;
    })
    .join('');

  const lastCol = colName(XLSX_HEADERS.length - 1);
  const lastRow = pratiche.length + 1;
  const cols = WIDTHS.map(
    (w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`,
  ).join('');

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols>
<sheetData><row r="1">${header}</row>${body}</sheetData>
<autoFilter ref="A1:${lastCol}${lastRow}"/>
</worksheet>`;

  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'xl/workbook.xml': strToU8(WORKBOOK),
    'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS),
    'xl/styles.xml': strToU8(STYLES),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
  });
}

/** `pratiche-2026-08-24.xlsx` — dated so successive exports don't overwrite
 *  each other in the Downloads folder. */
export function xlsxFilename(today: Date): string {
  return `pratiche-${today.toISOString().slice(0, 10)}.xlsx`;
}
