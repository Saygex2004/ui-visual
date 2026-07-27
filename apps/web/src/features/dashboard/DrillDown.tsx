// Geographic drill-down controls (UI §3.2). Region is a chip row with an
// explicit "Tutte le regioni" reset (spec wording); once a region is active,
// the panel below offers capital municipalities (toggle chips — no "all"
// option in the spec, so the active chip clears itself) and provinces (a
// native select with an explicit "Tutte le provincie" option, same pattern
// as Toolbar.tsx's other choosers). Capital and province are mutually
// exclusive: picking one always clears the other.
import { useTranslation } from 'react-i18next';
import type { ListingRow } from '@pvp/shared';
import type { AreaSearch } from './urlState.js';
import {
  regionsPresent,
  rowsForRegion,
  capitalsPresent,
  provincesPresent,
} from './drilldownHelpers.js';

export interface DrillDownProps {
  rows: readonly ListingRow[];
  search: AreaSearch;
  onPatch: (patch: Partial<AreaSearch>, opts?: { replace?: boolean }) => void;
}

export function DrillDown({ rows, search, onPatch }: DrillDownProps) {
  const { t } = useTranslation('dashboard');
  const regions = regionsPresent(rows);
  if (regions.length === 0) return null;

  const activeRegion = search.regione ?? null;

  function selectRegion(regione: string | null) {
    onPatch({ regione: regione ?? undefined, capoluogo: undefined, provincia: undefined });
  }

  return (
    <div className="drilldown">
      <div className="drilldown-chip-row" role="radiogroup" aria-label={t('drilldown.regionLabel')}>
        <button
          type="button"
          role="radio"
          aria-checked={activeRegion === null}
          className="drilldown-chip"
          data-active={activeRegion === null ? '' : undefined}
          onClick={() => selectRegion(null)}
        >
          {t('drilldown.allRegions')}
        </button>
        {regions.map((regione) => (
          <button
            key={regione}
            type="button"
            role="radio"
            aria-checked={activeRegion === regione}
            className="drilldown-chip"
            data-active={activeRegion === regione ? '' : undefined}
            onClick={() => selectRegion(regione)}
          >
            {regione}
          </button>
        ))}
      </div>

      {activeRegion != null ? (
        <RegionPanel rows={rowsForRegion(rows, activeRegion)} search={search} onPatch={onPatch} />
      ) : null}
    </div>
  );
}

function RegionPanel({
  rows,
  search,
  onPatch,
}: {
  rows: readonly ListingRow[];
  search: AreaSearch;
  onPatch: (patch: Partial<AreaSearch>, opts?: { replace?: boolean }) => void;
}) {
  const { t } = useTranslation('dashboard');
  const capitals = capitalsPresent(rows);
  const provinces = provincesPresent(rows);
  const activeCapital = search.capoluogo ?? null;

  function toggleCapital(comune: string) {
    onPatch({
      capoluogo: activeCapital === comune ? undefined : comune,
      provincia: undefined,
    });
  }

  function selectProvince(value: string) {
    onPatch({ provincia: value === '' ? undefined : value, capoluogo: undefined });
  }

  return (
    <div className="drilldown-panel">
      {capitals.length > 0 ? (
        <div
          className="drilldown-chip-row"
          role="radiogroup"
          aria-label={t('drilldown.capitalLabel')}
        >
          {capitals.map((comune) => (
            <button
              key={comune}
              type="button"
              role="radio"
              aria-checked={activeCapital === comune}
              className="drilldown-chip drilldown-chip-capital"
              data-active={activeCapital === comune ? '' : undefined}
              onClick={() => toggleCapital(comune)}
            >
              {t('drilldown.capitalChip', { comune })}
            </button>
          ))}
        </div>
      ) : null}

      <div className="drilldown-field">
        <label htmlFor="drilldown-provincia">{t('drilldown.provinceLabel')}</label>
        <select
          id="drilldown-provincia"
          value={search.provincia ?? ''}
          onChange={(e) => selectProvince(e.target.value)}
        >
          <option value="">{t('drilldown.allProvinces')}</option>
          {provinces.map((provincia) => (
            <option key={provincia} value={provincia}>
              {provincia}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
