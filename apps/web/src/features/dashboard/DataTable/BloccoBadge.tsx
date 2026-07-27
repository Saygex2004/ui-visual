// Blocco lot-count badge (UI §4.4): click isolates the block within the
// current table (badge shows as active via `aria-pressed`); clicking again —
// or "Reset filtri" — clears it. When the block continues in other clusters,
// the jump control (`BloccoJumpChooser`) renders beside it. Singletons (count
// < 2, or no blocco at all) render nothing.
import { useTranslation } from 'react-i18next';
import { otherClusters } from '../blocco.js';
import { BloccoJumpChooser } from './BloccoJumpChooser.js';
import type { ColumnContext } from './columns.js';

export interface BloccoBadgeProps {
  bloccoKey: string | null;
  count: number | null;
  effectiveClusterKey: string;
  ctx: ColumnContext;
}

export function BloccoBadge({ bloccoKey, count, effectiveClusterKey, ctx }: BloccoBadgeProps) {
  const { t } = useTranslation('dashboard');
  if (bloccoKey == null || count == null || count < 2) return null;

  const isActive = ctx.activeBlocco === bloccoKey;
  const entry = ctx.bloccoIndex[bloccoKey];
  const others = entry ? otherClusters(entry, effectiveClusterKey) : [];

  return (
    <span className="blocco-badge-cell">
      <button
        type="button"
        aria-pressed={isActive}
        className="blocco-badge"
        title={t('table.bloccoBadgeTitle', { count })}
        onClick={() => ctx.onIsolate(bloccoKey)}
      >
        {count}
      </button>
      {others.length > 0 ? (
        <BloccoJumpChooser bloccoKey={bloccoKey} otherClusterKeys={others} onJump={ctx.onJump} />
      ) : null}
    </span>
  );
}
