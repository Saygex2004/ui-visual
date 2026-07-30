// The shared thread view (UI §6.2) — embedded by both the workspace's chat
// tab and the standalone /chat/:listingId route (FRONTEND.md §2: "same
// component the workspace embeds"). Renders identically in both places; only
// the route level differs (the workspace Drawer is already the surrounding
// frame; the standalone route adds its own "← Le mie chat" link around this
// same component). Fetches everything it needs itself (`useThread`) rather
// than accepting a `ListingDetail` prop, so it stays self-sufficient in the
// standalone context too — cross-feature reuse of `features/workspace`'s own
// data layer would cut against FRONTEND.md §1's "cross-feature reuse goes
// through ratings/ and lib/, not deep imports between features".
import { useTranslation } from 'react-i18next';
import { useMe } from '../auth/hooks.js';
import {
  formatCurrency,
  formatComuneProvincia,
  formatText,
} from '../dashboard/DataTable/formatting.js';
import { useThread, useCloseThread, useReopenThread } from './hooks.js';
import { MessageList } from './MessageList.js';
import { Composer } from './Composer.js';
import { ParticipantList } from './ParticipantList.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import './chat.css';

export function ThreadView({ listingId }: { listingId: string }) {
  const { t } = useTranslation('chat');
  const { data: me } = useMe();
  const { data, isLoading, isError } = useThread(listingId, true);
  const closeThread = useCloseThread(listingId);
  const reopenThread = useReopenThread(listingId);

  if (isLoading) return <StatusDisplay variant="loading" message={t('loading')} />;
  if (isError || !data) return <StatusDisplay variant="error" message={t('loadError')} />;

  const { thread, messages } = data;
  const isAdmin = me?.user.role === 'admin';

  function handleClose() {
    if (!window.confirm(t('closed.closeConfirm'))) return;
    closeThread.mutate();
  }

  return (
    <div className="chat-thread-view">
      <div className="chat-thread-header">
        <h2 className="chat-thread-title">
          {formatText(thread.listing.tipo_bene)}
          {' — '}
          {formatText(thread.listing.tribunale)}
        </h2>
        {isAdmin ? (
          thread.closed ? (
            <button
              type="button"
              className="chat-thread-close-toggle"
              onClick={() => reopenThread.mutate()}
              disabled={reopenThread.isPending}
            >
              {t('closed.reopenAction')}
            </button>
          ) : (
            <button
              type="button"
              className="chat-thread-close-toggle"
              onClick={handleClose}
              disabled={closeThread.isPending}
            >
              {t('closed.closeAction')}
            </button>
          )
        ) : null}
      </div>

      {thread.listing.listing_available ? (
        <div className="chat-thread-listing-facts">
          <span>{formatComuneProvincia(thread.listing.comune, thread.listing.provincia)}</span>
          <span>
            {t('listing.valueLabel')}
            {': '}
            {formatCurrency(thread.listing.valore_richiesto)}
          </span>
          {thread.listing.link ? (
            <a href={thread.listing.link} target="_blank" rel="noopener noreferrer">
              {t('listing.goToListing')}
            </a>
          ) : null}
        </div>
      ) : (
        <StatusDisplay variant="info" message={t('removedListing.notice')} />
      )}

      <ParticipantList
        listingId={listingId}
        participants={thread.participants}
        closed={thread.closed}
      />

      {thread.closed ? (
        <p className="chat-closed-notice" role="status">
          {t('closed.notice')}
        </p>
      ) : null}

      <MessageList messages={messages} currentUserId={me?.user.id ?? ''} />

      {thread.closed ? null : <Composer listingId={listingId} disabled={false} />}
    </div>
  );
}
