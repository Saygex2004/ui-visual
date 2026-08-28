// Reads a .docx into the HTML the accettazione quotes.
//
// mammoth's own convertToHtml() produces "semantic" HTML and deliberately
// discards direct formatting — alignment and indentation among it. For a
// quoted proposal that is exactly the wrong trade: the point of citing the
// original is that it looks like the original. So we intercept the document
// model mammoth has already parsed (it handles runs, styles and lists for us)
// and serialise it ourselves, keeping those properties.
//
// mammoth is a heavy dependency and is loaded on demand, inside the reader
// below, so that opening the letterhead view does not pay for a feature most
// letters never use.

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Twip = the native OOXML unit (1/1440 inch) → px at 96dpi. */
function twipsToPx(twips: unknown): number {
  const n = parseInt(String(twips ?? ''), 10);
  return n ? Math.round((n / 1440) * 96) : 0;
}

const ALIGN_MAP: Record<string, string> = {
  left: 'left',
  right: 'right',
  center: 'center',
  both: 'justify',
};

interface Nodo {
  type: string;
  value?: string;
  href?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  alignment?: string;
  indent?: { start?: unknown; end?: unknown; firstLine?: unknown; hanging?: unknown };
  children?: Nodo[];
}

function runChildToHtml(node: Nodo): string {
  if (node.type === 'text') return escapeHtml(node.value ?? '');
  if (node.type === 'tab') return '    ';
  if (node.type === 'break') return '<br/>';
  return '';
}

function inlineToHtml(nodes: Nodo[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'run') {
        let html = (node.children ?? []).map(runChildToHtml).join('');
        if (node.isBold) html = `<strong>${html}</strong>`;
        if (node.isItalic) html = `<em>${html}</em>`;
        if (node.isUnderline) html = `<u>${html}</u>`;
        return html;
      }
      if (node.type === 'hyperlink') {
        return `<a href="${escapeHtml(node.href ?? '')}">${inlineToHtml(node.children ?? [])}</a>`;
      }
      return runChildToHtml(node);
    })
    .join('');
}

function paragraphStyleAttr(p: Nodo): string {
  const styles: string[] = [];
  const align = p.alignment ? ALIGN_MAP[p.alignment] : undefined;
  if (align) styles.push(`text-align:${align}`);
  const indent = p.indent ?? {};
  const left = twipsToPx(indent.start);
  if (left) styles.push(`padding-left:${left}px`);
  const right = twipsToPx(indent.end);
  if (right) styles.push(`padding-right:${right}px`);
  if (indent.firstLine) styles.push(`text-indent:${twipsToPx(indent.firstLine)}px`);
  else if (indent.hanging) styles.push(`text-indent:-${twipsToPx(indent.hanging)}px`);
  return styles.length ? ` style="${styles.join(';')}"` : '';
}

function blockToHtml(el: Nodo): string {
  if (el.type === 'paragraph') {
    const inner = inlineToHtml(el.children ?? []);
    return `<p${paragraphStyleAttr(el)}>${inner || '&nbsp;'}</p>`;
  }
  if (el.type === 'table') {
    return (el.children ?? [])
      .map((row) =>
        (row.children ?? [])
          .map((cell) => (cell.children ?? []).map(blockToHtml).join(''))
          .join(''),
      )
      .join('');
  }
  return '';
}

async function convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  // The package entry, not its browser bundle: mammoth's own `browser` field
  // already redirects the two Node-only modules, so this resolves correctly in
  // the bundle and keeps the published type declarations.
  const mammoth = await import('mammoth');
  let captured: Nodo | null = null;
  await mammoth.convertToHtml(
    { arrayBuffer },
    {
      transformDocument: (doc: Nodo) => {
        captured = doc;
        return doc;
      },
    },
  );
  const documento = captured as Nodo | null;
  if (!documento) return '';
  return (documento.children ?? []).map(blockToHtml).join('');
}

/** Drops the trailing signature block — the row of underscores and everything
 *  after it (name, role). Quoting someone's signature back at them inside a
 *  letter of acceptance is not what the citation is for. */
function stripTrailingSignature(html: string): string {
  const dom = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, 'text/html');
  const blocks = Array.from(dom.body.children);
  const sigIndex = blocks.findIndex((el) => /^_{5,}$/.test((el.textContent ?? '').trim()));
  if (sigIndex !== -1) {
    for (let i = blocks.length - 1; i >= sigIndex; i--) blocks[i]!.remove();
  }
  return dom.body.innerHTML;
}

/** A .docx keeps its formatting; a .txt becomes one paragraph per line. */
export async function leggiFileCitazione(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith('.docx')) {
    return stripTrailingSignature(await convertDocxToHtml(await file.arrayBuffer()));
  }
  const testo = await file.text();
  return testo
    .split('\n')
    .map((riga) => `<p>${riga ? escapeHtml(riga) : '<br>'}</p>`)
    .join('');
}
