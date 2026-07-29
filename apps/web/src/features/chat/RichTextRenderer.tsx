// Read-only render of a sanitized message body (UI §6.2). Deliberately a
// plain recursive component, not a second TipTap/ProseMirror editor instance
// per message: a thread can hold many messages, and mounting one full live
// editor per message (each with its own DOM-sync machinery) for something
// that's purely display is real, avoidable overhead (UI §11's performance
// bar) — TipTap earns its cost in the ONE interactive Composer instance, not
// here. This renders exactly the allowlisted shape (SPECIFICATIONS.md §11)
// the server already sanitized; it never re-sanitizes or interprets raw
// HTML — every text run is passed through React as data, never dangerouslySet.
import type { ReactNode } from 'react';
import type { RichTextNode } from '@pvp/shared';

type RichTextMark = NonNullable<RichTextNode['marks']>[number];

function renderMarks(text: string, marks: readonly RichTextMark[] | undefined): ReactNode {
  if (!marks || marks.length === 0) return text;
  return marks.reduce<ReactNode>((acc, mark) => {
    if (mark.type === 'bold') return <strong>{acc}</strong>;
    if (mark.type === 'italic') return <em>{acc}</em>;
    if (mark.type === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : undefined;
      if (!href) return acc;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {acc}
        </a>
      );
    }
    return acc;
  }, text);
}

function renderChildren(nodes: readonly RichTextNode[] | undefined): ReactNode {
  return nodes?.map((node, index) => <RenderNode key={index} node={node} />);
}

function RenderNode({ node }: { node: RichTextNode }): ReactNode {
  switch (node.type) {
    case 'text':
      return renderMarks(node.text ?? '', node.marks);
    case 'hardBreak':
      return <br />;
    case 'paragraph':
      return <p>{renderChildren(node.content)}</p>;
    case 'bulletList':
      return <ul>{renderChildren(node.content)}</ul>;
    case 'orderedList':
      return <ol>{renderChildren(node.content)}</ol>;
    case 'listItem':
      return <li>{renderChildren(node.content)}</li>;
    default:
      return null; // already sanitized server-side; unreachable in practice
  }
}

export function RichTextRenderer({ content }: { content: RichTextNode }) {
  return <div className="chat-richtext">{renderChildren(content.content)}</div>;
}
