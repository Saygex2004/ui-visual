// The OMI "available" facts (range/tipologia/stato/caption/caveat) shared
// between the drill-down price panel (OmiPanel.tsx, UI §3.3) and the listing
// workspace's price-context section (UI §4.5) — same figures, same mandated
// residential caveat, two different surfaces. The caller owns the wrapping
// element, the title, and the "not available" branch, since those differ
// between the two call sites (the workspace omits the section entirely when
// there's no data; the drill-down panel always shows an explicit message).
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatText, NOT_AVAILABLE } from './DataTable/formatting.js';

export interface OmiFactsData {
  comune: string;
  zona: string | null;
  semestre: string;
  tipologia: string | null;
  stato: string | null;
  min_mq: number | null;
  max_mq: number | null;
}

function formatPerSqm(value: number | null): string {
  return value == null ? NOT_AVAILABLE : formatCurrency(value);
}

export function OmiFacts({ data }: { data: OmiFactsData }) {
  const { t } = useTranslation('dashboard');
  return (
    <>
      <p className="omi-panel-range">
        {t('omi.range', { min: formatPerSqm(data.min_mq), max: formatPerSqm(data.max_mq) })}
      </p>
      <p className="omi-panel-facts">
        {t('omi.tipologia', { value: formatText(data.tipologia) })}
        {' · '}
        {t('omi.stato', { value: formatText(data.stato) })}
      </p>
      <p className="omi-panel-caption">
        {t('omi.caption', {
          comune: data.comune,
          zona: formatText(data.zona),
          semestre: data.semestre,
        })}
      </p>
      <p className="omi-panel-caveat">{t('omi.residentialCaveat')}</p>
    </>
  );
}
