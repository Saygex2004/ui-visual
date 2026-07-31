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
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react';
import type { RichTextNode } from '@pvp/shared';
import {
  createMentionExtension,
  mentionOptionId,
  type MentionCandidate,
  type MentionController,
  type MentionState,
} from './mention/mentionExtension.js';
import { MentionPopup } from './mention/MentionPopup.js';
import { registerMentionCloser } from './mention/activeMentionRegistry.js';
import { PromptDialog } from '../../components/PromptDialog.js';
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

/** Toolbar buttons must never take focus off the editor: a formatting click
 *  has to apply to the current selection, and after it the caret has to stay
 *  where the writer left it. Preventing the mousedown default is the standard
 *  way to do that — without it the browser moves focus to the button, the
 *  selection collapses, and the next keystrokes go nowhere. */
function keepEditorFocus(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

export interface RichTextEditorHandle {
  clear: () => void;
}

export interface RichTextEditorProps {
  onChange: (doc: RichTextNode, isEmpty: boolean) => void;
  disabled: boolean;
  /** Enter-to-send. Omitted = Enter keeps its default paragraph behaviour. */
  onSubmit?: () => void;
  /** Enables the @-mention suggestion. `candidates` is the live pool —
   *  filtering happens here, so a pool that arrives while the picker is open
   *  (the lazy candidates fetch resolving) refreshes it in place. */
  mention?: {
    candidates: readonly MentionCandidate[];
    onPick: (item: MentionCandidate) => void;
    /** Called when the composer is first focused — the cue to start loading
     *  candidates, so they are ready by the time someone types "@". */
    onActive?: () => void;
  };
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ onChange, disabled, onSubmit, mention }, ref) {
    const { t } = useTranslation('chat');
    const mentionListboxId = useId();

    const [mentionState, setMentionState] = useState<MentionState | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const mentionStateRef = useRef<MentionState | null>(null);
    const mentionRef = useRef(mention);
    mentionRef.current = mention;
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;

    function filterCandidates(query: string): MentionCandidate[] {
      const pool = mentionRef.current?.candidates ?? [];
      const q = query.trim().toLowerCase();
      return q ? pool.filter((c) => c.username.toLowerCase().includes(q)) : [...pool];
    }
    const filterRef = useRef(filterCandidates);
    filterRef.current = filterCandidates;

    // One stable controller: the extension closes over it once; every call
    // reads the latest props through refs.
    const controller = useMemo<MentionController>(
      () => ({
        getItems: (query) => filterRef.current(query),
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

    // See activeMentionRegistry.ts for why this exists: Radix's Dialog
    // (workspace drawer) would otherwise also close on the same Escape that
    // dismisses this popup. WorkspacePanel calls `closeActiveMention()`
    // directly from its own `onEscapeKeyDown`, so register/unregister
    // whenever a mention is open here.
    useEffect(() => {
      if (!mentionState) return;
      registerMentionCloser(() => controller.setState(null));
      return () => registerMentionCloser(null);
    }, [mentionState, controller]);

    // The candidates fetch is lazy, so it can resolve while the picker is
    // already open — re-filter into the open picker instead of leaving it
    // showing whatever was loaded when "@" was typed.
    const candidates = mention?.candidates;
    useEffect(() => {
      const state = mentionStateRef.current;
      if (!state) return;
      const next = { ...state, items: filterRef.current(state.query) };
      mentionStateRef.current = next;
      setMentionState(next);
    }, [candidates]);

    const extensions = useMemo(() => {
      // Chat-composer key model (Phase 13): Enter sends, Shift+Enter starts a
      // new paragraph, and inside a list Enter keeps its default meaning (next
      // item / exit on an empty one) so multi-block messages stay composable.
      // Priority outranks StarterKit's own Enter/Shift-Enter bindings.
      const submitOnEnter = Extension.create({
        name: 'submitOnEnter',
        priority: 1000,
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
            'Shift-Enter': () => {
              if (!onSubmitRef.current) return false; // no send binding, no override
              return this.editor.commands.splitBlock();
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

    // TipTap's `createView` merges `role: 'textbox'` with `editorProps.
    // attributes` only once, at construction — a later reconfigure (Tiptap
    // calls `view.setOptions` whenever this object's reference changes,
    // which it would on every render if inlined) applies `attributes`
    // as-is, with no such merge, silently dropping the role. Memoized so it
    // never churns, and `role` is listed explicitly anyway so the element's
    // accessible role doesn't depend on which code path last touched it.
    const editorProps = useMemo(
      () => ({
        attributes: { role: 'textbox', 'aria-label': t('compose.textboxLabel') },
      }),
      [t],
    );

    const editor = useEditor({
      extensions,
      editable: !disabled,
      immediatelyRender: false,
      editorProps,
      onFocus: () => {
        // Start loading mention candidates on first focus, so the picker is
        // already populated when someone types "@".
        mentionRef.current?.onActive?.();
      },
      onUpdate: ({ editor: current }) => {
        onChange(current.getJSON() as RichTextNode, current.isEmpty);
      },
    });

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [editor, disabled]);

    // Links the editable surface to the mention popup for assistive
    // technology: `MentionPopup` renders `role="listbox"`/`role="option"`
    // (mentionOptionId), but the real DOM focus never leaves the
    // contenteditable root — TipTap's suggestion plugin drives the popup
    // through React state, not real focus moves. `aria-activedescendant`
    // is the standard way to announce "this option is current" without
    // moving focus; `aria-controls`/`aria-expanded` announce that the
    // editor owns a collapsible listbox at all.
    useEffect(() => {
      const dom = editor?.view.dom;
      if (!dom) return;
      if (mentionState) {
        dom.setAttribute('aria-expanded', 'true');
        dom.setAttribute('aria-controls', mentionListboxId);
        if (mentionState.items.length > 0) {
          dom.setAttribute(
            'aria-activedescendant',
            mentionOptionId(mentionListboxId, mentionState.activeIndex),
          );
        } else {
          dom.removeAttribute('aria-activedescendant');
        }
      } else {
        dom.removeAttribute('aria-expanded');
        dom.removeAttribute('aria-controls');
        dom.removeAttribute('aria-activedescendant');
      }
      return () => {
        dom.removeAttribute('aria-expanded');
        dom.removeAttribute('aria-controls');
        dom.removeAttribute('aria-activedescendant');
      };
    }, [editor, mentionState, mentionListboxId]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          editor?.commands.clearContent(true);
        },
      }),
      [editor],
    );

    // Phase 13: the URL is collected by the shared PromptDialog rather than
    // the browser's `window.prompt`. TipTap keeps its own selection while
    // focus is inside the dialog, so `chain().focus()` still applies the mark
    // exactly where the writer left the caret.
    function applyLink(url: string) {
      if (!editor) return;
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
          <MentionPopup
            state={mentionState}
            onPick={(item) => controller.pick(item)}
            listboxId={mentionListboxId}
          />
        ) : null}
        <div className="chat-editor-toolbar" role="toolbar" aria-label={t('compose.placeholder')}>
          <button
            type="button"
            className="chat-editor-toolbar-button"
            onMouseDown={keepEditorFocus}
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
            onMouseDown={keepEditorFocus}
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
            onMouseDown={keepEditorFocus}
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
            onMouseDown={keepEditorFocus}
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
            onMouseDown={keepEditorFocus}
            aria-pressed={editor?.isActive('link') ?? false}
            disabled={disabled}
            title={t('compose.link')}
            onClick={() => setLinkDialogOpen(true)}
          >
            <LinkIcon aria-hidden="true" size={16} />
          </button>
        </div>
        <EditorContent editor={editor} className="chat-editor-content" />
        <PromptDialog
          open={linkDialogOpen}
          title={t('compose.link')}
          label={t('compose.linkPrompt')}
          placeholder={t('compose.linkPlaceholder')}
          inputType="url"
          confirmLabel={t('compose.linkConfirm')}
          cancelLabel={t('common:actions.cancel')}
          onSubmit={applyLink}
          onOpenChange={setLinkDialogOpen}
        />
      </div>
    );
  },
);
