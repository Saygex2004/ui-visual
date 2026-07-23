// Rich-text allowlist (SPECIFICATIONS.md §11). Chat message bodies are TipTap
// (ProseMirror) JSON constrained to this fixed set — bold, italic, bulleted and
// numbered lists, and links; nothing else survives. The sanitizer (server-side,
// Phase 7) strips any node/mark not listed here and drops non-http(s) link
// hrefs (e.g. `javascript:`). Plain-text URLs are linkified by the same rule.

/** Allowed ProseMirror node types. */
export const ALLOWED_RICHTEXT_NODES: ReadonlySet<string> = new Set([
  'doc',
  'paragraph',
  'text',
  'bulletList',
  'orderedList',
  'listItem',
  'hardBreak',
]);

/** Allowed marks. */
export const ALLOWED_RICHTEXT_MARKS: ReadonlySet<string> = new Set(['bold', 'italic', 'link']);

/** URL schemes permitted on link marks; everything else is dropped. */
export const ALLOWED_LINK_SCHEMES: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:']);
