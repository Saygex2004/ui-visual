// The workbook is hand-built, so these tests read the produced file back
// rather than trusting the builder: unzip it, and assert on the XML Excel
// will actually parse. A malformed part does not throw here — it makes Excel
// say "the file is corrupt", which no amount of green unit tests would catch.
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import type { Pratica } from '@pvp/shared';
import { XLSX_HEADERS, praticheToXlsx, xlsxFilename } from './praticheXlsx.js';

function pratica(over: Partial<Pratica> = {}): Pratica {
  return {
    id: 'p1',
    ndg: ['900123'],
    numero_pratica: '163354',
    portafoglio: 'Augusto',
    stato: 'spedito',
    n_scatole: '3, 7',
    note: null,
    ordinato_da: null,
    slack_tag_user_id: null,
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

function parts(
  pratiche: Pratica[],
  ...rest: Parameters<typeof praticheToXlsx> extends [unknown, ...infer R] ? R : never
): Record<string, string> {
  const zip = unzipSync(praticheToXlsx(pratiche, ...rest));
  return Object.fromEntries(Object.entries(zip).map(([k, v]) => [k, strFromU8(v)]));
}

const sheetOf = (pratiche: Pratica[]) => parts(pratiche)['xl/worksheets/sheet1.xml']!;

describe('praticheToXlsx — package shape', () => {
  it('is a zip carrying every part Excel requires', () => {
    // Miss any one of these and Excel refuses the file outright.
    expect(Object.keys(parts([pratica()])).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ]);
  });

  it('starts with the ZIP signature, so the browser and Excel recognise it', () => {
    const bytes = praticheToXlsx([pratica()]);
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('declares the two built-in fills Excel demands at index 0 and 1', () => {
    // Omitting them is the classic "file is corrupt" cause.
    const styles = parts([pratica()])['xl/styles.xml']!;
    expect(styles).toContain('<fills count="2">');
    expect(styles).toContain('patternType="gray125"');
  });

  it('produces a valid workbook for an empty register', () => {
    const sheet = sheetOf([]);
    expect(sheet).toContain('<row r="1">'); // the header still exists
    expect(sheet).toContain('A1:M1'); // autofilter over the header alone
  });
});

describe('praticheToXlsx — cell types', () => {
  it('writes the header once, bold, in the declared order', () => {
    const sheet = sheetOf([pratica()]);
    for (const h of XLSX_HEADERS) expect(sheet).toContain(`<t>${h}</t>`);
    expect(sheet).toContain('<c r="A1" s="1"'); // s=1 is the bold style
  });

  it('writes a date as an Excel serial with the date style, not as text', () => {
    // 2026-08-21 is 46255 days after 1899-12-30. As text it would neither
    // sort nor filter by date range, which is the point of the column.
    const sheet = sheetOf([pratica({ data_spedizione: '2026-08-21' })]);
    expect(sheet).toContain('s="2"><v>46255</v>');
    expect(sheet).not.toContain('21/08/2026');
  });

  it('writes the cost as a real number in euros, with the money style', () => {
    const sheet = sheetOf([pratica({ costo_spedizione_cent: 1250 })]);
    expect(sheet).toContain('s="3"><v>12.5</v>');
    // Not "12,50": a formatted string would stop the column being summed,
    // and the display comma comes from the numFmt instead.
    expect(sheet).not.toContain('12,50');
  });

  it('keeps a large amount exact', () => {
    expect(sheetOf([pratica({ costo_spedizione_cent: 17700 })])).toContain('<v>177</v>');
  });

  it('leaves an absent date and an absent cost as empty styled cells', () => {
    const sheet = sheetOf([pratica()]);
    expect(sheet).toContain('s="2"/>'); // empty but still date-formatted
    expect(sheet).toContain('s="3"/>');
    expect(sheet).not.toContain('null');
  });

  it('writes identifiers as text, so leading zeros survive', () => {
    const sheet = sheetOf([pratica({ numero_pratica: '000123' })]);
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain('<t xml:space="preserve">000123</t>');
  });

  it('renders the stage and the account through the injected labels', () => {
    const sheet = sheetOf([]);
    expect(sheet).toBeDefined();
    const withLabels = unzipSync(
      praticheToXlsx(
        [pratica({ stato: 'archiviato', ordinato_da: 'u7' })],
        () => 'rossi',
        (s) => (s === 'archiviato' ? 'Archiviato / rientrato' : s),
      ),
    );
    const xml = strFromU8(withLabels['xl/worksheets/sheet1.xml']!);
    expect(xml).toContain('Archiviato / rientrato');
    expect(xml).toContain('rossi');
  });
});

describe('praticheToXlsx — XML safety', () => {
  it('escapes the characters that would otherwise break the sheet', () => {
    // Notes are free text; an unescaped & or < makes Excel reject the file.
    const sheet = sheetOf([pratica({ note: 'Rossi & C. <srl> "in liquidazione"' })]);
    expect(sheet).toContain('Rossi &amp; C. &lt;srl&gt; &quot;in liquidazione&quot;');
    expect(sheet).not.toContain('<srl>');
  });

  it('strips control characters, which are illegal in XML at any escaping', () => {
    const sheet = sheetOf([pratica({ note: 'primadopo' })]);
    expect(sheet).toContain('primadopo');
  });

  it('preserves leading and trailing spaces in free text', () => {
    const sheet = sheetOf([pratica({ note: '  spaziato  ' })]);
    expect(sheet).toContain('xml:space="preserve">  spaziato  <');
  });
});

describe('praticheToXlsx — rows', () => {
  it('writes exactly the pratiche given, one row each below the header', () => {
    const sheet = sheetOf([pratica({ ndg: ['UNO'] }), pratica({ ndg: ['DUE'] })]);
    expect(sheet).toContain('<row r="2">');
    expect(sheet).toContain('<row r="3">');
    expect(sheet).not.toContain('<row r="4">');
    expect(sheet).toContain('UNO');
    expect(sheet).toContain('DUE');
  });

  it('spans the autofilter over the header plus every row', () => {
    expect(sheetOf([pratica(), pratica()])).toContain('ref="A1:M3"');
  });

  it('freezes the header row so it stays visible while scrolling', () => {
    expect(sheetOf([pratica()])).toContain('ySplit="1"');
  });
});

describe('xlsxFilename', () => {
  it('dates the file so successive exports do not overwrite each other', () => {
    expect(xlsxFilename(new Date('2026-08-24T15:00:00Z'))).toBe('pratiche-2026-08-24.xlsx');
  });
});
