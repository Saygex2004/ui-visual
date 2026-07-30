// The scrollable message list (UI §6.2): author + timestamp above the body,
// own-vs-others styling, rich-text render, attachment previews/downloads.
// Auto-scrolls to a new message only when the viewer was already near the
// bottom — tracked via a scroll-updated ref (not state, so scrolling itself
// never triggers a re-render), checked once per message-count change.
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { ChatMessageView, AttachmentDescriptor } from '@pvp/shared';
import { formatTimestamp } from '../dashboard/DataTable/formatting.js';
import { RichTextRenderer } from './RichTextRenderer.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { Avatar } from '../../components/Avatar.js';
import * as chatApi from './api.js';

const NEAR_BOTTOM_PX = 80;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentItem({ attachment }: { attachment: AttachmentDescriptor }) {
  const { t } = useTranslation('chat');
  const isImage = attachment.content_type.startsWith('image/');
  const { data } = useQuery({
    queryKey: ['attachments', attachment.id, 'url'],
    queryFn: () => chatApi.fetchAttachmentUrl(attachment.id),
    staleTime: 10 * 60 * 1000, // the server's signed URL TTL defaults to 15 min
  });

  return (
    <div className="chat-attachment">
      {isImage && data ? (
        <a href={data.url} target="_blank" rel="noopener noreferrer">
          <img src={data.url} alt={attachment.filename} className="chat-attachment-preview" />
        </a>
      ) : null}
      <a
        href={data?.url}
        download={attachment.filename}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-attachment-download"
      >
        {t('attachments.download')}
        {' — '}
        {attachment.filename}
        {' ('}
        {formatBytes(attachment.size_bytes)}
        {')'}
      </a>
    </div>
  );
}

function MessageItem({ message, isOwn }: { message: ChatMessageView; isOwn: boolean }) {
  const { t } = useTranslation('chat');
  const authorName = message.author_username ?? message.author_id;
  return (
    <li className={`chat-message-row${isOwn ? ' chat-message-row-own' : ''}`}>
      {!isOwn ? <Avatar name={authorName} size="lg" title={authorName} /> : null}
      <div className={`chat-message${isOwn ? ' chat-message-own' : ''}`}>
        <div className="chat-message-meta">
          <span className="chat-message-author">{isOwn ? t('messages.you') : authorName}</span>
          <span className="chat-message-time">{formatTimestamp(message.sent_at)}</span>
        </div>
        <div className="chat-message-bubble">
          {message.body ? <RichTextRenderer content={message.body} /> : null}
          {message.attachments.length > 0 ? (
            <div className="chat-message-attachments">
              {message.attachments.map((a) => (
                <AttachmentItem key={a.id} attachment={a} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export interface MessageListProps {
  messages: readonly ChatMessageView[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const { t } = useTranslation('chat');
  const containerRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el && wasNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    wasNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  if (messages.length === 0) {
    return (
      <StatusDisplay
        variant="empty"
        layout="block"
        className="chat-message-list-empty"
        title={t('messages.emptyTitle')}
        message={t('messages.empty')}
      />
    );
  }

  return (
    <div className="chat-message-list" ref={containerRef} onScroll={handleScroll}>
      <ul className="chat-message-list-inner">
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} isOwn={m.author_id === currentUserId} />
        ))}
      </ul>
    </div>
  );
}
