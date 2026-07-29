// Sanitizer property tests (SPECIFICATIONS.md §11, TESTING.md §2) — hostile
// inputs a real client would never send, since the sanitizer is defense in
// depth against a bypassing/malicious client, not just imperfect paste.
import { describe, it, expect } from 'vitest';
import { sanitizeRichText, extractPlainText, type RichTextNode } from './richtext.js';

function doc(...content: RichTextNode[]): RichTextNode {
  return { type: 'doc', content };
}
function p(...content: RichTextNode[]): RichTextNode {
  return { type: 'paragraph', content };
}
function text(value: string, marks?: RichTextNode['marks']): RichTextNode {
  return marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
}

describe('sanitizeRichText', () => {
  it('lets every allowed node/mark survive unchanged', () => {
    const input = doc(
      p(
        text('plain '),
        text('bold', [{ type: 'bold' }]),
        text(' and ', undefined),
        text('italic', [{ type: 'italic' }]),
      ),
      { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('item one'))] }] },
      {
        type: 'orderedList',
        content: [{ type: 'listItem', content: [p(text('item two'))] }],
      },
      { type: 'paragraph', content: [text('line'), { type: 'hardBreak' }, text('break')] },
    );
    const out = sanitizeRichText(input);
    expect(out).toEqual(input);
  });

  it('drops a node whose type is not in the allowlist, entirely, at any depth', () => {
    const input = doc(
      { type: 'heading', attrs: { level: 1 }, content: [text('Title')] },
      p(text('kept')),
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'image', attrs: { src: 'http://evil.example/x.png' } },
              p(text('also kept')),
            ],
          },
        ],
      },
      { type: 'codeBlock', content: [text('rm -rf /')] },
    );
    const out = sanitizeRichText(input);
    expect(out).toEqual(
      doc(p(text('kept')), {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [p(text('also kept'))] }],
      }),
    );
  });

  it('strips a disallowed mark but keeps the text', () => {
    const input = doc(p(text('styled', [{ type: 'strike' }, { type: 'bold' }])));
    const out = sanitizeRichText(input);
    expect(out).toEqual(doc(p(text('styled', [{ type: 'bold' }]))));
  });

  it('drops a javascript: link mark, keeping the plain text', () => {
    const input = doc(
      p(text('click me', [{ type: 'link', attrs: { href: "javascript:alert('xss')" } }])),
    );
    const out = sanitizeRichText(input);
    expect(out).toEqual(doc(p(text('click me'))));
  });

  it('drops a data: link mark', () => {
    const input = doc(
      p(
        text('img', [
          { type: 'link', attrs: { href: 'data:text/html,<script>alert(1)</script>' } },
        ]),
      ),
    );
    const out = sanitizeRichText(input);
    expect(out).toEqual(doc(p(text('img'))));
  });

  it('keeps http, https, and mailto link marks', () => {
    for (const href of [
      'http://example.com',
      'https://example.com/path?x=1',
      'mailto:team@example.com',
    ]) {
      const input = doc(p(text('go', [{ type: 'link', attrs: { href } }])));
      const out = sanitizeRichText(input);
      expect(out).toEqual(doc(p(text('go', [{ type: 'link', attrs: { href } }]))));
    }
  });

  it('linkifies a bare http(s) URL typed as plain text', () => {
    const input = doc(p(text('see https://pvp.giustizia.it/lotto/1055 for details')));
    const out = sanitizeRichText(input);
    expect(out).toEqual(
      doc(
        p(
          text('see '),
          text('https://pvp.giustizia.it/lotto/1055', [
            { type: 'link', attrs: { href: 'https://pvp.giustizia.it/lotto/1055' } },
          ]),
          text(' for details'),
        ),
      ),
    );
  });

  it('does not re-linkify a text node that already carries an explicit link mark', () => {
    const input = doc(
      p(text('https://example.com', [{ type: 'link', attrs: { href: 'https://example.com' } }])),
    );
    const out = sanitizeRichText(input);
    expect(out).toEqual(input);
  });

  it('an empty document sanitizes to an empty doc', () => {
    expect(sanitizeRichText(doc())).toEqual(doc());
  });

  it('a completely malformed top-level node (not "doc") is still normalized to a doc', () => {
    const input = { type: 'heading', content: [p(text('hi'))] };
    const out = sanitizeRichText(input);
    expect(out).toEqual(doc(p(text('hi'))));
  });
});

describe('extractPlainText', () => {
  it('concatenates text across nested paragraphs and lists', () => {
    const input = doc(p(text('hello ')), {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [p(text('world'))] }],
    });
    expect(extractPlainText(input)).toBe('hello world');
  });

  it('is empty for a document with no text', () => {
    expect(extractPlainText(doc())).toBe('');
  });
});
