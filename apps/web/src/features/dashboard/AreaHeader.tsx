// Area header (UI §2.3 + §10.1, Phase 13 layout): back link + h1 + a
// horizontal KV metadata row on the left, the "Aggiorna alla data odierna"
// brand button top-right. `snapshot.meta` is already server-mapped via
// `mapRefreshMetadata` (apps/server/src/cache/build.ts) — the client only
// formats and displays it, never re-derives it. The §10.2 refresh region is
// the approved v1 deferral: a static note, no interactive re-fetch control,
// and no fabricated "next refresh at HH:MM" claim — the API carries no such
// field to back one. `onRefreshToday` (§9.2) is an entirely different,
// unrelated control: it re-evaluates which already-loaded rows now have a
// past sale date, client-side only — never a data re-fetch.
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import type { AreaSlug, SnapshotMeta } from '@pvp/shared';
import { Button } from '../../components/Button.js';
import { formatTimestamp, NOT_AVAILABLE } from './DataTable/formatting.js';

export interface AreaHeaderProps {
  area: AreaSlug;
  meta: SnapshotMeta;
  onBack: () => void;
  onRefreshToday: () => void;
}

export function AreaHeader({ area, meta, onBack, onRefreshToday }: AreaHeaderProps) {
  const { t } = useTranslation('dashboard');

  return (
    <header className="area-header">
      <div className="area-header-main">
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
      </div>
      <Button severity="brand" className="area-refresh-today-control" onClick={onRefreshToday}>
        <RefreshCw aria-hidden="true" size={15} />
        {t('archive.refreshControl')}
      </Button>
    </header>
  );
}
