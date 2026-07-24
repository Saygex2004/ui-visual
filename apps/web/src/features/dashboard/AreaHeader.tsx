// Area header (UI §2.3 + §10.1). `snapshot.meta` is already server-mapped via
// `mapRefreshMetadata` (apps/server/src/cache/build.ts) — the client only
// formats and displays it, never re-derives it. The OMI fetched_at/semestre
// caption belongs to the price panel (UI §3.3, Phase 5), not this header.
// The §10.2 refresh region is the approved v1 deferral: a static note, no
// interactive re-fetch control, and no fabricated "next refresh at HH:MM"
// claim — the API carries no such field to back one.
import { useTranslation } from 'react-i18next';
import type { AreaSlug, SnapshotMeta } from '@pvp/shared';
import { formatTimestamp, NOT_AVAILABLE } from './DataTable/formatting.js';

export interface AreaHeaderProps {
  area: AreaSlug;
  meta: SnapshotMeta;
  onBack: () => void;
}

export function AreaHeader({ area, meta, onBack }: AreaHeaderProps) {
  const { t } = useTranslation('dashboard');

  return (
    <header className="area-header">
      <button type="button" className="area-back-control" onClick={onBack}>
        {t('area.backControl')}
      </button>
      <h1 className="area-title">{t(`area.title.${area}`)}</h1>
      <dl className="area-metadata-row">
        <div className="area-metadata-item">
          <dt>{t('area.metadata.lastFetched')}</dt>
          <dd>
            {meta.last_success_at
              ? formatTimestamp(meta.last_success_at)
              : t('area.metadata.neverFetched')}
          </dd>
        </div>
        <div className="area-metadata-item">
          <dt>{t('area.metadata.analyzed')}</dt>
          <dd>
            {t('area.metadata.analyzedValue', {
              stored: meta.total_stored ?? NOT_AVAILABLE,
              total: meta.total_active ?? NOT_AVAILABLE,
            })}
          </dd>
        </div>
        {meta.excluded_by_rules != null ? (
          <div className="area-metadata-item">
            <dt>{t('area.metadata.excluded')}</dt>
            <dd>{meta.excluded_by_rules}</dd>
          </div>
        ) : null}
      </dl>
      <p className="area-refresh-note">{t('area.refreshDeferralNote')}</p>
    </header>
  );
}
