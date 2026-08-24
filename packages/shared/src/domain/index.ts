// Domain rules — DOMAIN_RULES.md as pure, individually-exported functions.
// No I/O, no side effects; classification is computed at read time and never
// stored.
export * from './priceBand.js';
export * from './classify.js';
export * from './blocco.js';
export * from './sort.js';
export * from './pastSale.js';
export * from './rng.js';
export * from './calendar.js';
export * from './omi.js';
export * from './refreshMeta.js';
export * from './geography.js';
export * from './procedureConcorsuali.js';
// Selective, not `export *`: `RichTextNode`/`RichTextMark` here are a
// structural twin of the same-named types already exported from
// `schemas/partB/chat.js` (see richtext.ts's own header comment) — `export *`
// would collide at the package root barrel. Only the functions are public;
// callers passing/receiving rich-text nodes already have the schema type.
export { sanitizeRichText, extractPlainText } from './richtext.js';
