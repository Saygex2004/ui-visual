// Rich-text compose + attach + send (UI §6.2). Attachments are uploaded
// ahead of send (API_CONTRACT.md §6) — picking a file uploads it immediately
// and adds it to a pending list shown above the input; Send references
// whatever pending attachment ids exist at that moment. A message must carry
// text, attachments, or both — enforced here (before ever calling the
// server) and again server-side.
import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RichTextNode } from '@pvp/shared';
import { translateApiError } from '../../lib/translateApiError.js';
import { RichTextEditor, type RichTextEditorHandle } from './RichTextEditor.js';
import { useSendMessage, useUploadAttachment } from './hooks.js';
import type { UploadedAttachment } from './api.js';
import './chat.css';

export interface ComposerProps {
  listingId: string;
  disabled: boolean;
}

export function Composer({ listingId, disabled }: ComposerProps) {
  const { t } = useTranslation('chat');
  const editorRef = useRef<RichTextEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState<RichTextNode | null>(null);
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [pending, setPending] = useState<UploadedAttachment[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const sendMessage = useSendMessage(listingId);
  const uploadAttachment = useUploadAttachment(listingId);
  const isBusy = disabled || sendMessage.isPending;

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after removal
    if (!file) return;
    uploadAttachment.mutate(file, {
      onSuccess: (res) => setPending((prev) => [...prev, res.attachment]),
    });
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSend() {
    setValidationError(null);
    if (bodyEmpty && pending.length === 0) {
      setValidationError(t('compose.mustContainSomething'));
      return;
    }
    sendMessage.mutate(
      { body: bodyEmpty ? null : body, attachmentIds: pending.map((a) => a.id) },
      {
        onSuccess: () => {
          editorRef.current?.clear();
          setBody(null);
          setBodyEmpty(true);
          setPending([]);
        },
      },
    );
  }

  return (
    <div className="chat-composer">
      <RichTextEditor
        ref={editorRef}
        disabled={isBusy}
        onChange={(doc, isEmpty) => {
          setBody(doc);
          setBodyEmpty(isEmpty);
        }}
      />
      {pending.length > 0 ? (
        <ul className="chat-composer-pending">
          <li className="chat-composer-pending-title">{t('attachments.pending')}</li>
          {pending.map((a) => (
            <li key={a.id} className="chat-composer-pending-item">
              {a.filename}
              <button type="button" onClick={() => removePending(a.id)}>
                {t('attachments.remove')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {validationError ? (
        <p className="chat-composer-error" role="alert">
          {validationError}
        </p>
      ) : null}
      {sendMessage.isError ? (
        <p className="chat-composer-error" role="alert">
          {translateApiError(t, sendMessage.error, t('compose.sendError'))}
        </p>
      ) : null}
      {uploadAttachment.isError ? (
        <p className="chat-composer-error" role="alert">
          {translateApiError(t, uploadAttachment.error, t('compose.sendError'))}
        </p>
      ) : null}
      <div className="chat-composer-actions">
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={handleFileSelected}
          disabled={isBusy}
        />
        <button
          type="button"
          className="chat-composer-attach"
          onClick={handleAttachClick}
          disabled={isBusy || uploadAttachment.isPending}
        >
          {t('compose.attach')}
        </button>
        <button type="button" className="chat-composer-send" onClick={handleSend} disabled={isBusy}>
          {t('compose.send')}
        </button>
      </div>
    </div>
  );
}
