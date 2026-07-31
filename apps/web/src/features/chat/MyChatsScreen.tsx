// *Le mie chat* (UI §6.3): every thread the user participates in, most
// recent activity first (server order, already sorted). Unread items are
// emphasized; a removed listing's item is de-emphasized and not openable —
// same `listing_available` flag `ThreadView`'s header uses.
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { ThreadListItem } from '@pvp/shared';
import {
  formatCurrency,
  formatComuneProvincia,
  formatText,
} from '../dashboard/DataTable/formatting.js';
import { useMyChatsQuery } from './hooks.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { translateLoadError } from '../../lib/translateApiError.js';
import './chat.css';

function previewText(thread: ThreadListItem, t: (key: string) => string): string {
  if (!thread.preview) return t('myChats.noMessagesYet');
  const author = thread.participants.find((p) => p.id === thread.preview!.author_id);
  const excerpt = thread.preview.excerpt || t('myChats.attachmentOnlyPreview');
  return `${author?.username ?? thread.preview.author_id}: ${excerpt}`;
}

function ThreadItemContent({ thread }: { thread: ThreadListItem }) {
  const { t } = useTranslation('chat');
  return (
    <>
      <div className="chat-my-chats-item-header">
        <span className="chat-my-chats-item-title">
          {formatText(thread.listing.tipo_bene)}
          {' — '}
          {formatText(thread.listing.tribunale)}
        </span>
        {thread.unread > 0 ? (
          <span
            className="chat-my-chats-item-unread"
            aria-label={t('common:userMenu.unread', { count: thread.unread })}
          >
            {thread.unread > 9 ? '9+' : thread.unread}
          </span>
        ) : null}
        {thread.closed ? (
          <span className="chat-my-chats-item-closed">{t('closed.badge')}</span>
        ) : null}
      </div>
      <div className="chat-my-chats-item-meta">
        {thread.listing.listing_available ? (
          <>
            {formatComuneProvincia(thread.listing.comune, thread.listing.provincia)}
            {' · '}
            {formatCurrency(thread.listing.valore_richiesto)}
          </>
        ) : (
          t('myChats.removedListing')
        )}
      </div>
      <div className="chat-my-chats-item-preview">{previewText(thread, t)}</div>
      <div className="chat-my-chats-item-participants">
        {thread.participants.map((p) => p.username).join(', ')}
      </div>
    </>
  );
}

export function MyChatsScreen() {
  const { t } = useTranslation('chat');
  const { data, isLoading, isError, error } = useMyChatsQuery();

  if (isLoading) return <StatusDisplay variant="loading" message={t('loading')} />;
  if (isError)
    return <StatusDisplay variant="error" message={translateLoadError(t, error, 'loadError')} />;

  const threads = data?.threads ?? [];

  return (
    <div className="chat-my-chats">
      <h1 className="chat-my-chats-title">{t('myChats.title')}</h1>
      {threads.length === 0 ? (
        <StatusDisplay variant="empty" message={t('myChats.empty')} />
      ) : (
        <ul className="chat-my-chats-list">
          {threads.map((thread) => {
            const classNames = [
              'chat-my-chats-item',
              thread.unread > 0 ? 'chat-my-chats-item-unread-emphasis' : '',
              thread.listing.listing_available ? '' : 'chat-my-chats-item-deemphasized',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={thread.listing_id} className={classNames}>
                {thread.listing.listing_available ? (
                  <Link
                    to="/chat/$listingId"
                    params={{ listingId: thread.listing_id }}
                    className="chat-my-chats-item-link"
                  >
                    <ThreadItemContent thread={thread} />
                  </Link>
                ) : (
                  <div className="chat-my-chats-item-notlink">
                    <ThreadItemContent thread={thread} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
