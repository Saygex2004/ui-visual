// Placeholder for the listing workspace panel (UI §4.5). The route and its
// full search-param shape (area filters + `pannello`) already exist and
// round-trip correctly — the real panel (details/rating/related lots/
// history/chat) is Phase 6; resist reaching into its scope here.
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import './dashboard.css';

export function WorkspacePlaceholder() {
  const { t } = useTranslation('dashboard');
  const { id } = useParams({ from: '/protected-layout/aste/$area/lotto/$id' });
  return (
    <aside className="workspace-placeholder" role="complementary">
      <p>{t('workspace.placeholder', { id })}</p>
    </aside>
  );
}
