// Rich-text sanitizer (SPECIFICATIONS.md §11) — the one function applied at
// write time so every reader renders identical stored truth; the client
// renderer must never re-sanitize. Domain files import nothing from
// `schemas/`, so `RichTextNode` here is a structural twin of
// `schemas/partB/chat.ts`'s Zod-inferred type (same precedent as
// `domain/omi.ts`'s OmiDoc/OmiDisplayDoc) — TypeScript structural typing
// makes them interchangeable with no cast.
import {
  ALLOWED_RICHTEXT_NODES,
  ALLOWED_RICHTEXT_MARKS,
  ALLOWED_LINK_SCHEMES,
} from '../constants/richtext.js';

export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichTextMark[];
  content?: RichTextNode[];
}

function isAllowedHref(href: unknown): boolean {
  if (typeof href !== 'string') return false;
  try {
    return ALLOWED_LINK_SCHEMES.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

function sanitizeMarks(marks: RichTextMark[] | undefined): RichTextMark[] | undefined {
  if (!marks) return undefined;
  const kept = marks
    .filter((m) => ALLOWED_RICHTEXT_MARKS.has(m.type))
    .filter((m) => m.type !== 'link' || isAllowedHref(m.attrs?.href))
    .map((m) => (m.attrs ? { type: m.type, attrs: m.attrs } : { type: m.type }));
  return kept.length > 0 ? kept : undefined;
}

/** Split a plain-text run into segments, wrapping any bare http(s) URL with a
 *  synthetic `link` mark — "web links pasted as plain text are made
 *  clickable" (UI §6.2). Never applied to a node that already carries an
 *  explicit `link` mark (its display text is deliberate, not a raw URL to
 *  re-linkify). A fresh regex per call — `g`-flagged regexes are stateful,
 *  and this function may run many times per document. */
function linkifyText(node: RichTextNode): RichTextNode[] {
  const text = node.text ?? '';
  const alreadyLinked = node.marks?.some((m) => m.type === 'link') ?? false;
  if (alreadyLinked) return [node];

  const pattern = /https?:\/\/[^\s<>"']+/g;
  const segments: RichTextNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ ...node, text: text.slice(lastIndex, match.index) });
    }
    const url = match[0];
    segments.push({
      ...node,
      text: url,
      marks: [...(node.marks ?? []), { type: 'link', attrs: { href: url } }],
    });
    lastIndex = match.index + url.length;
  }
  if (segments.length === 0) return [node]; // no URL found — unchanged
  if (lastIndex < text.length) {
    segments.push({ ...node, text: text.slice(lastIndex) });
  }
  return segments;
}

function sanitizeChildren(nodes: RichTextNode[] | undefined): RichTextNode[] | undefined {
  if (!nodes) return undefined;
  const result: RichTextNode[] = [];
  for (const child of nodes) {
    const sanitized = sanitizeNode(child);
    if (sanitized === null) continue;
    if (sanitized.type === 'text') {
      result.push(...linkifyText(sanitized));
    } else {
      result.push(sanitized);
    }
  }
  return result;
}

/** Sanitize one node. Returns `null` when the node's own type is not in the
 *  allowlist — the whole subtree is dropped, not partially unwrapped (a
 *  conservative choice: unwrapping risks producing structurally invalid
 *  ProseMirror JSON from adversarial input; dropping never does). */
function sanitizeNode(node: RichTextNode): RichTextNode | null {
  if (!ALLOWED_RICHTEXT_NODES.has(node.type)) return null;

  const sanitized: RichTextNode = { type: node.type };
  if (typeof node.text === 'string') sanitized.text = node.text;
  const marks = sanitizeMarks(node.marks);
  if (marks) sanitized.marks = marks;
  const content = sanitizeChildren(node.content);
  if (content) sanitized.content = content;
  return sanitized;
}

/** Sanitize a full TipTap document against the approved node/mark allowlist
 *  (SPECIFICATIONS.md §11) — applied once, at write time; every reader
 *  renders the stored result unchanged. Always returns a well-formed
 *  `{type:'doc', content: [...]}`, even from hostile or malformed input. */
export function sanitizeRichText(doc: RichTextNode): RichTextNode {
  const sanitized = sanitizeNode({ ...doc, type: 'doc' });
  return sanitized ?? { type: 'doc', content: [] };
}

/** Plain-text length of a (sanitized) document — for the server's
 *  `PVPDASH_MESSAGE_MAX_CHARS` check (CONFIGURATION.md §2: "plain-text
 *  extraction counted"). Call AFTER sanitizing: sanitization only ever
 *  shrinks content, never grows it, so measuring the sanitized form is always
 *  safe and correct. */
export function extractPlainText(node: RichTextNode): string {
  let out = node.text ?? '';
  for (const child of node.content ?? []) out += extractPlainText(child);
  return out;
}
