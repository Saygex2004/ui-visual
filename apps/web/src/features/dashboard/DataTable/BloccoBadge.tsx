// Blocco lot-count badge (UI §4.4) — display + sort only this phase. The
// click-to-isolate interaction and the cross-cluster jump control are Phase 5
// (`PHASE_5_DRILLDOWN_OMI_ARCHIVE.md` task 3); singletons (count 1, or no
// blocco at all) show nothing, matching "the UI decides to badge only count
// ≥ 2" (packages/shared's blocco_index already includes singletons).
import { useTranslation } from 'react-i18next';

export function BloccoBadge({ count }: { count: number | null }) {
  const { t } = useTranslation('dashboard');
  if (count == null || count < 2) return null;
  return (
    <span className="blocco-badge" title={t('table.bloccoBadgeTitle', { count })}>
      {count}
    </span>
  );
}
