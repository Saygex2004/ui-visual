// OMI price-context panel (UI §3.3, DOMAIN_RULES.md §9). Shown once a
// province OR a capital municipality is selected in the drill-down. For a
// capital, `comune === provincia` by construction (DrillDown only ever offers
// comuni identified that way via `isCapitalComune`), so the capital's own
// province name IS the capital string itself — no lookup needed. For a plain
// province, the panel falls back to that province's capital document via
// `capitalComuneForProvince`; a province whose capital isn't present in the
// current data renders the same "not available" state as a real OMI error
// (DATA_MODEL.md §4: an absent document and an error document are never
// distinguished to the user).
import { useTranslation } from 'react-i18next';
import { selectOmiDisplayEntry, type ListingRow, type OmiEntry } from '@pvp/shared';
import type { AreaSearch } from './urlState.js';
import { capitalComuneForProvince } from './drilldownHelpers.js';
import { formatCurrency, formatText, NOT_AVAILABLE } from './DataTable/formatting.js';

export interface OmiPanelProps {
  rows: readonly ListingRow[];
  omiByComune: Readonly<Record<string, OmiEntry>>;
  search: AreaSearch;
}

function formatPerSqm(value: number | null): string {
  return value == null ? NOT_AVAILABLE : formatCurrency(value);
}

export function OmiPanel({ rows, omiByComune, search }: OmiPanelProps) {
  const { t } = useTranslation('dashboard');

  const provincia = search.capoluogo ?? search.provincia ?? null;
  if (provincia === null) return null;

  const capitalComune = search.capoluogo ?? capitalComuneForProvince(rows, provincia);
  const selection = selectOmiDisplayEntry(omiByComune, {
    provincia,
    comune: search.capoluogo ?? null,
    capitalComune,
  });

  return (
    <div className="omi-panel" role="status">
      <h3 className="omi-panel-title">{t('omi.title')}</h3>
      {selection ? (
        <>
          <p className="omi-panel-range">
            {t('omi.range', {
              min: formatPerSqm(selection.min_mq),
              max: formatPerSqm(selection.max_mq),
            })}
          </p>
          <p className="omi-panel-facts">
            {t('omi.tipologia', { value: formatText(selection.tipologia) })}
            {' · '}
            {t('omi.stato', { value: formatText(selection.stato) })}
          </p>
          <p className="omi-panel-caption">
            {t('omi.caption', {
              comune: selection.comune,
              zona: formatText(selection.zona),
              semestre: selection.semestre,
            })}
          </p>
          <p className="omi-panel-caveat">{t('omi.residentialCaveat')}</p>
        </>
      ) : (
        <p className="omi-panel-unavailable">{t('omi.unavailable', { provincia })}</p>
      )}
    </div>
  );
}
