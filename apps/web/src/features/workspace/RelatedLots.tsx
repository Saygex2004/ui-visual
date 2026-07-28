// Related blocco lots (UI §4.5): the other active lots of the same
// proceeding, each openable in the workspace in turn. A plain list of links —
// unlike the table's cross-cluster jump (blocco.ts, Phase 5), opening a
// sibling here just navigates to ITS OWN workspace, it never touches any
// table's cluster/tab/isolation state, so blocco.ts's helpers don't apply.
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { AreaSlug, BloccoSibling } from '@pvp/shared';
import type { ListingSearch } from '../dashboard/urlState.js';
import { formatCurrency, formatText } from '../dashboard/DataTable/formatting.js';

export interface RelatedLotsProps {
  blocco: { key: string; count: number; siblings: readonly BloccoSibling[] };
  area: AreaSlug;
  search: ListingSearch;
}

export function RelatedLots({ blocco, area, search }: RelatedLotsProps) {
  const { t } = useTranslation('workspace');

  return (
    <div className="workspace-related-lots">
      <h3>{t('relatedLots.title', { count: blocco.count })}</h3>
      {blocco.siblings.length === 0 ? (
        <p className="workspace-status">{t('relatedLots.empty')}</p>
      ) : (
        <ul className="workspace-related-lots-list">
          {blocco.siblings.map((sibling) => (
            <li key={sibling.id}>
              <Link
                to="/aste/$area/lotto/$id"
                params={{ area, id: sibling.id }}
                search={{ ...search, pannello: 'dettagli' }}
                className="workspace-related-lot-link"
              >
                {formatText(sibling.tipo_bene)}
                {' · '}
                {formatText(sibling.comune)}
                {' · '}
                {formatCurrency(sibling.valore_richiesto)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
