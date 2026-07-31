// Rich-text compose + attach + send (UI §6.2, redesigned in Execution Plan
// Phase 13). Attachments are uploaded ahead of send (API_CONTRACT.md §6) —
// picking a file uploads it immediately and adds it to a pending list shown
// above the input; Send references whatever pending attachment ids exist at
// that moment. A message must carry text, attachments, or both — enforced
// here (before ever calling the server) and again server-side.
//
// Phase 13: Enter sends (Shift+Enter for a new line; lists keep Enter),
// and typing `@` opens the mention picker — choosing a colleague who isn't
// yet a participant adds them to the thread through the same
// add-participant API the popover uses. The candidates fetch stays lazy:
// it's enabled the first time a mention is actually opened.
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, SendHorizontal } from 'lucide-react';
import type { RichTextNode, UserRef } from '@pvp/shared';
import { translateApiError } from '../../lib/translateApiError.js';
import { RichTextEditor, type RichTextEditorHandle } from './RichTextEditor.js';
import type { MentionCandidate } from './mention/mentionExtension.js';
import {
  useAddParticipant,
  useParticipantCandidates,
  useSendMessage,
  useUploadAttachment,
} from './hooks.js';
import type { UploadedAttachment } from './api.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { Button } from '../../components/Button.js';
import './chat.css';

export interface ComposerProps {
  listingId: string;
  disabled: boolean;
  participants: readonly UserRef[];
}

export function Composer({ listingId, disabled, participants }: ComposerProps) {
  const { t } = useTranslation('chat');
  const editorRef = useRef<RichTextEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState<RichTextNode | null>(null);
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [pending, setPending] = useState<UploadedAttachment[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mentionUsed, setMentionUsed] = useState(false);

  const sendMessage = useSendMessage(listingId);
  const uploadAttachment = useUploadAttachment(listingId);
  const addParticipant = useAddParticipant(listingId);
  const candidatesQuery = useParticipantCandidates(listingId, mentionUsed);
  const isBusy = disabled || sendMessage.isPending;

  const mentionPool = useMemo<MentionCandidate[]>(() => {
    const fromParticipants = participants.map((p) => ({
      id: p.id,
      username: p.username,
      isParticipant: true,
    }));
    const fromCandidates = (candidatesQuery.data?.users ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      isParticipant: false,
    }));
    return [...fromParticipants, ...fromCandidates].sort((a, b) =>
      a.username.localeCompare(b.username),
    );
  }, [participants, candidatesQuery.data]);
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

  const mention = useMemo(
    () => ({
      candidates: mentionPool,
      onPick: (item: MentionCandidate) => {
        if (!item.isParticipant) addParticipant.mutate(item.id);
      },
      onActive: () => setMentionUsed(true),
    }),
    // addParticipant.mutate is referentially stable per React Query's contract
    [mentionPool, addParticipant.mutate],
  );

  return (
    <div className="chat-composer">
      <RichTextEditor
        ref={editorRef}
        disabled={isBusy}
        onChange={(doc, isEmpty) => {
          setBody(doc);
          setBodyEmpty(isEmpty);
        }}
        onSubmit={handleSend}
        mention={mention}
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
      {validationError ? <StatusDisplay variant="error" message={validationError} /> : null}
      {sendMessage.isError ? (
        <StatusDisplay
          variant="error"
          message={translateApiError(t, sendMessage.error, t('compose.sendError'))}
        />
      ) : null}
      {uploadAttachment.isError ? (
        <StatusDisplay
          variant="error"
          message={translateApiError(t, uploadAttachment.error, t('compose.sendError'))}
        />
      ) : null}
      <div className="chat-composer-actions">
        <span className="chat-composer-hint">{t('compose.hint')}</span>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={handleFileSelected}
          disabled={isBusy}
        />
        <Button
          severity="secondary"
          size="small"
          className="chat-composer-attach"
          onClick={handleAttachClick}
          disabled={isBusy || uploadAttachment.isPending}
        >
          <Paperclip aria-hidden="true" size={14} />
          {t('compose.attach')}
        </Button>
        <Button
          severity="primary"
          size="small"
          className="chat-composer-send"
          onClick={handleSend}
          disabled={isBusy}
        >
          <SendHorizontal aria-hidden="true" size={14} />
          {t('compose.send')}
        </Button>
      </div>
    </div>
  );
}
