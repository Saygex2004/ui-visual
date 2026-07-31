// TESTING.md §6 / Execution Plan Phase 11 task 4: every `t('key')` call site
// in the app must resolve to a real key in the `it` catalog, and the build
// (here, `pnpm test`) fails if one doesn't. No such check existed before this
// phase — every namespace file was only checked for *existing*
// (`i18n.test.ts`), never for *matching what the code actually calls*.
//
// This is a static regex scan, not a full TypeScript/Babel AST parse — the
// codebase's own convention is narrow enough (one `const { t } =
// useTranslation('ns')` per component function, a single quoted or
// template-literal first argument to every `t(...)` call) that a scanner
// tuned to that convention is simpler and cheaper to maintain than pulling in
// an AST toolchain, without giving up accuracy: every non-literal call site
// (e.g. `lib/translateApiError.ts`'s `t(err.key.replace(...), ...)`, a fully
// dynamic server-supplied key) simply doesn't match either literal-argument
// regex below, so it's excluded by construction rather than by an explicit
// ignore-list.
import { readFileSync, globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resources, NAMESPACES } from './index.js';

// pnpm always runs this package's `test` script (and thus Vitest) with cwd
// set to apps/web/ — the same assumption every other file-scanning tool in
// this monorepo's scripts already relies on.
const SRC_DIR = `${process.cwd()}/`;
const EXCLUDE = [/\.test\.tsx?$/, /^src[\\/]i18n[\\/]/];

interface SourceFile {
  relPath: string;
  lines: string[];
}

function loadSourceFiles(): SourceFile[] {
  const files = globSync('src/**/*.{ts,tsx}', { cwd: SRC_DIR }).filter(
    (f) => !EXCLUDE.some((re) => re.test(f)),
  );
  return files.map((relPath) => ({
    relPath,
    lines: readFileSync(`${SRC_DIR}${relPath}`, 'utf8').split('\n'),
  }));
}

interface CallSite {
  file: string;
  line: number;
  raw: string; // the key exactly as written, `${...}` segments included verbatim
}

const USE_TRANSLATION_RE = /useTranslation\(\s*['"]([a-zA-Z]+)['"]\s*\)/;
// First argument to `t(...)`: either a single/double-quoted plain string or a
// backtick template literal. Both are captured as their raw inner text.
const T_CALL_RE = /\bt\(\s*(?:'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`]*)`)/g;

function collectCallSites(files: SourceFile[]): CallSite[] {
  const sites: CallSite[] = [];
  for (const { relPath, lines } of files) {
    lines.forEach((lineText, idx) => {
      T_CALL_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = T_CALL_RE.exec(lineText))) {
        const raw = match[1] ?? match[2] ?? match[3] ?? '';
        if (raw === '') continue; // t('') isn't a real key reference
        sites.push({ file: relPath, line: idx + 1, raw });
      }
    });
  }
  return sites;
}

function collectNamespacesByFile(files: SourceFile[]): Map<string, { line: number; ns: string }[]> {
  const byFile = new Map<string, { line: number; ns: string }[]>();
  for (const { relPath, lines } of files) {
    const entries: { line: number; ns: string }[] = [];
    lines.forEach((lineText, idx) => {
      const m = USE_TRANSLATION_RE.exec(lineText);
      USE_TRANSLATION_RE.lastIndex = 0;
      if (m) entries.push({ line: idx + 1, ns: m[1]! });
    });
    if (entries.length > 0) byFile.set(relPath, entries);
  }
  return byFile;
}

function resolveNamespace(
  site: CallSite,
  nsByFile: Map<string, { line: number; ns: string }[]>,
):
  | { file: string; line: number; namespace: string; raw: string }
  | { file: string; line: number; error: string } {
  // Explicit `ns:key` prefix — only if the colon appears before any `${`.
  const dollarIdx = site.raw.indexOf('${');
  const colonIdx = site.raw.indexOf(':');
  if (colonIdx !== -1 && (dollarIdx === -1 || colonIdx < dollarIdx)) {
    return {
      file: site.file,
      line: site.line,
      namespace: site.raw.slice(0, colonIdx),
      raw: site.raw.slice(colonIdx + 1),
    };
  }

  const entries = nsByFile.get(site.file);
  if (!entries || entries.length === 0) {
    return {
      file: site.file,
      line: site.line,
      error: `no useTranslation() found in ${site.file} to resolve a namespace`,
    };
  }
  const distinctNs = new Set(entries.map((e) => e.ns));
  const namespace =
    distinctNs.size === 1
      ? [...distinctNs][0]!
      : (entries.filter((e) => e.line <= site.line).at(-1)?.ns ?? entries[0]!.ns);

  return { file: site.file, line: site.line, namespace, raw: site.raw };
}

function keyExists(namespace: string, keyPath: string): boolean {
  const ns = (resources.it as Record<string, unknown>)[namespace];
  if (typeof ns !== 'object' || ns === null) return false;

  const dollarIdx = keyPath.indexOf('${');
  const segments = (dollarIdx === -1 ? keyPath : keyPath.slice(0, dollarIdx).replace(/\.$/, ''))
    .split('.')
    .filter(Boolean);
  if (segments.length === 0) return false;

  if (dollarIdx !== -1) {
    // Truncated at a dynamic segment — the resolved node must be a non-empty
    // object, not an enumeration of every possible interpolated value.
    let node: unknown = ns;
    for (const segment of segments) {
      if (typeof node !== 'object' || node === null) return false;
      node = (node as Record<string, unknown>)[segment];
    }
    return typeof node === 'object' && node !== null && Object.keys(node).length > 0;
  }

  // Walk to the PARENT of the final segment, then check the final segment
  // there — either as a direct string leaf, or (i18next pluralization) as a
  // `<segment>_one`/`<segment>_other` pair.
  let parent: unknown = ns;
  for (const segment of segments.slice(0, -1)) {
    if (typeof parent !== 'object' || parent === null) return false;
    parent = (parent as Record<string, unknown>)[segment];
  }
  if (typeof parent !== 'object' || parent === null) return false;
  const parentObj = parent as Record<string, unknown>;
  const leaf = segments.at(-1)!;

  if (typeof parentObj[leaf] === 'string') return true;
  return (
    typeof parentObj[`${leaf}_one`] === 'string' && typeof parentObj[`${leaf}_other`] === 'string'
  );
}

describe('i18n completeness', () => {
  it('every t(...) call site resolves to a real key in the it catalog', () => {
    const files = loadSourceFiles();
    const callSites = collectCallSites(files);
    const nsByFile = collectNamespacesByFile(files);

    const missing: string[] = [];
    for (const site of callSites) {
      const resolved = resolveNamespace(site, nsByFile);
      if ('error' in resolved) {
        missing.push(`${resolved.file}:${resolved.line} — ${resolved.error}`);
        continue;
      }
      if (!NAMESPACES.includes(resolved.namespace as (typeof NAMESPACES)[number])) {
        missing.push(
          `${resolved.file}:${resolved.line} — unknown namespace "${resolved.namespace}" (key "${resolved.raw}")`,
        );
        continue;
      }
      if (!keyExists(resolved.namespace, resolved.raw)) {
        missing.push(
          `${resolved.file}:${resolved.line} — ${resolved.namespace}:${resolved.raw} has no matching key`,
        );
      }
    }

    expect(missing, missing.join('\n')).toEqual([]);
  });
});
