// Standalone /chat/:listingId (UI §6.2, FRONTEND.md §2: "same component the
// workspace embeds"). No Drawer here to provide a frame, so this adds the
// page's own minimal chrome — a back link to *Le mie chat* — around the same
// `ThreadView` the workspace's chat tab renders directly.
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ThreadView } from './ThreadView.js';
import './chat.css';

export function ChatThreadRoute() {
  const { t } = useTranslation('chat');
  const { listingId } = useParams({ from: '/protected-layout/chat/$listingId' });
  return (
    <div className="chat-standalone-page">
      <Link to="/chat" className="chat-standalone-back">
        {t('back')}
      </Link>
      <ThreadView listingId={listingId} />
    </div>
  );
}
