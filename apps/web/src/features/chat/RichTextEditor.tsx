// The compose rich-text input (UI §6.2) — the one place this feature uses a
// real, live TipTap editor (unlike RichTextRenderer's plain recursive
// display component): an interactive input genuinely needs it, and there is
// only ever one instance mounted at a time. StarterKit's bundled extensions
// are pared down to exactly the allowed shape (SPECIFICATIONS.md §11);
// everything the server's sanitizer would strip is disabled here too, so
// what the user sees while typing already matches what gets stored.
//
// Phase 13 additions: the @-mention suggestion (mention/mentionExtension.ts
// — popup state lives here, rendered above the editor) and Enter-to-send
// (Shift+Enter keeps inserting a hard break via StarterKit's own binding;
// Enter falls through to its default behaviour inside lists, where it
// splits the list item, and while the mention popup is open, where the
// suggestion plugin owns it).
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react';
import type { RichTextNode } from '@pvp/shared';
import {
  createMentionExtension,
  type MentionCandidate,
  type MentionController,
  type MentionState,
} from './mention/mentionExtension.js';
import { MentionPopup } from './mention/MentionPopup.js';
import './chat.css';

const BASE_EXTENSIONS = [
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
  /** Enter-to-send. Omitted = Enter keeps its default paragraph behaviour. */
  onSubmit?: () => void;
  /** Enables the @-mention suggestion. */
  mention?: {
    getItems: (query: string) => MentionCandidate[];
    onPick: (item: MentionCandidate) => void;
    /** First time the popup opens — lazily enable the candidates fetch. */
    onActive?: () => void;
  };
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ onChange, disabled, onSubmit, mention }, ref) {
    const { t } = useTranslation('chat');

    const [mentionState, setMentionState] = useState<MentionState | null>(null);
    const mentionStateRef = useRef<MentionState | null>(null);
    const mentionRef = useRef(mention);
    mentionRef.current = mention;
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;

    // One stable controller: the extension closes over it once; every call
    // reads the latest props through refs.
    const controller = useMemo<MentionController>(
      () => ({
        getItems: (query) => {
          mentionRef.current?.onActive?.();
          return mentionRef.current?.getItems(query) ?? [];
        },
        onPick: (item) => mentionRef.current?.onPick(item),
        setState: (state) => {
          mentionStateRef.current = state;
          setMentionState(state);
        },
        getState: () => mentionStateRef.current,
        pick: () => {},
      }),
      [],
    );

    const extensions = useMemo(() => {
      const submitOnEnter = Extension.create({
        name: 'submitOnEnter',
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              if (mentionStateRef.current) return false; // suggestion owns it
              if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
                return false; // default: split the list item
              }
              const submit = onSubmitRef.current;
              if (!submit) return false;
              submit();
              return true;
            },
          };
        },
      });
      return [
        ...BASE_EXTENSIONS,
        submitOnEnter,
        ...(mentionRef.current ? [createMentionExtension(controller)] : []),
      ];
    }, [controller]);

    const editor = useEditor({
      extensions,
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
        {mentionState ? (
          <MentionPopup state={mentionState} onPick={(item) => controller.pick(item)} />
        ) : null}
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
