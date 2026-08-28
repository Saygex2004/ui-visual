// The letter body, edited as rich text.
//
// Built on the project's Tiptap rather than porting the original's toolbar,
// which drove formatting through document.execCommand — deprecated, and a
// second editor to maintain beside the one the chat already uses.
//
// It reads and writes HTML, not Tiptap's own JSON, because HTML is what the
// Word generator consumes: htmlToDocxParagraphs walks the markup and maps it
// onto Word runs. Keeping HTML as the stored shape means the body a letter
// was drafted with survives independently of the editor, and the generator
// stays the tested, ported code rather than a second converter.
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, List, ListOrdered, Underline as UnderlineIcon } from 'lucide-react';

export interface CorpoEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function CorpoEditor({ value, onChange }: CorpoEditorProps) {
  const { t } = useTranslation('carta');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The letterhead body is prose: no headings, no quotes, no code —
        // those have no place in a legal letter and the Word mapping has no
        // rule for them.
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  if (!editor) return null;

  const azioni = [
    {
      id: 'bold',
      Icona: Bold,
      attivo: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      Icona: Italic,
      attivo: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: 'strike',
      Icona: UnderlineIcon,
      attivo: editor.isActive('strike'),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      id: 'bulletList',
      Icona: List,
      attivo: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'orderedList',
      Icona: ListOrdered,
      attivo: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="carta-editor">
      <div className="carta-editor-toolbar" role="toolbar" aria-label={t('editor.toolbar')}>
        {azioni.map(({ id, Icona, attivo, run }) => (
          <button
            key={id}
            type="button"
            className={`carta-editor-btn${attivo ? ' is-active' : ''}`}
            aria-pressed={attivo}
            aria-label={t(`editor.${id}`)}
            onClick={run}
          >
            <Icona aria-hidden="true" size={15} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="carta-editor-content" />
    </div>
  );
}
