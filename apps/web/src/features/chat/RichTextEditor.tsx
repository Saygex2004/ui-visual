// The compose rich-text input (UI §6.2) — the one place this feature uses a
// real, live TipTap editor (unlike RichTextRenderer's plain recursive
// display component): an interactive input genuinely needs it, and there is
// only ever one instance mounted at a time. StarterKit's bundled extensions
// are pared down to exactly the allowed shape (SPECIFICATIONS.md §11);
// everything the server's sanitizer would strip is disabled here too, so
// what the user sees while typing already matches what gets stored.
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react';
import type { RichTextNode } from '@pvp/shared';
import './chat.css';

const EXTENSIONS = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    },
  }),
];

export interface RichTextEditorHandle {
  clear: () => void;
}

export interface RichTextEditorProps {
  onChange: (doc: RichTextNode, isEmpty: boolean) => void;
  disabled: boolean;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ onChange, disabled }, ref) {
    const { t } = useTranslation('chat');

    const editor = useEditor({
      extensions: EXTENSIONS,
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor: current }) => {
        onChange(current.getJSON() as RichTextNode, current.isEmpty);
      },
    });

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [editor, disabled]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          editor?.commands.clearContent(true);
        },
      }),
      [editor],
    );

    function addLink() {
      if (!editor) return;
      const url = window.prompt(t('compose.linkPrompt'));
      if (!url) return;
      const chain = editor.chain().focus();
      if (editor.state.selection.empty) {
        // Structured JSON insertion, not an HTML string — never parses
        // arbitrary user input as markup.
        chain
          .insertContent({
            type: 'text',
            text: url,
            marks: [{ type: 'link', attrs: { href: url } }],
          })
          .run();
      } else {
        chain.extendMarkRange('link').setLink({ href: url }).run();
      }
    }

    return (
      <div className="chat-editor">
        <div className="chat-editor-toolbar" role="toolbar" aria-label={t('compose.placeholder')}>
          <button
            type="button"
            className="chat-editor-toolbar-button"
            aria-pressed={editor?.isActive('bold') ?? false}
            disabled={disabled}
            title={t('compose.bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            className="chat-editor-toolbar-button"
            aria-pressed={editor?.isActive('italic') ?? false}
            disabled={disabled}
            title={t('compose.italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            className="chat-editor-toolbar-button"
            aria-pressed={editor?.isActive('bulletList') ?? false}
            disabled={disabled}
            title={t('compose.bulletList')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            className="chat-editor-toolbar-button"
            aria-pressed={editor?.isActive('orderedList') ?? false}
            disabled={disabled}
            title={t('compose.orderedList')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            className="chat-editor-toolbar-button"
            aria-pressed={editor?.isActive('link') ?? false}
            disabled={disabled}
            title={t('compose.link')}
            onClick={addLink}
          >
            <LinkIcon aria-hidden="true" size={16} />
          </button>
        </div>
        <EditorContent editor={editor} className="chat-editor-content" />
      </div>
    );
  },
);
