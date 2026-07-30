// Geographic drill-down controls (UI §3.2, redesigned in Execution Plan
// Phase 13): the region chip row becomes a compact select beside the
// cluster combobox in the selector toolbar; once a region is active, the
// capital-municipality chips and the province select appear as further
// fields in the same toolbar (progressive disclosure). Selection logic is
// unchanged: an explicit "Tutte le regioni" option, capital chips with no
// "all" option (the active chip clears itself), and capital/province
// mutually exclusive — picking one always clears the other.
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import type { ListingRow } from '@pvp/shared';
import type { AreaSearch } from './urlState.js';
import { Field } from '../../components/Field.js';
import { SelectField } from '../../components/SelectField.js';
import { SearchSelect } from '../../components/SearchSelect.js';
import {
  regionsPresent,
  rowsForRegion,
  capitalsPresent,
  provincesPresent,
} from './drilldownHelpers.js';

const ALL_REGIONS_ID = '__all__';

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
    <>
      <Field label={t('drilldown.regionLabel')} className="selector-field-region">
        <SearchSelect
          searchable={false}
          trigger={
            <>
              <MapPin aria-hidden="true" size={15} className="drilldown-region-icon" />
              <span className="drilldown-region-value">
                {activeRegion ?? t('drilldown.allRegions')}
              </span>
            </>
          }
          triggerAriaLabel={t('drilldown.regionLabel')}
          emptyMessage={t('drilldown.allRegions')}
          options={[
            {
              id: ALL_REGIONS_ID,
              textValue: t('drilldown.allRegions'),
              selected: activeRegion === null,
              label: <span>{t('drilldown.allRegions')}</span>,
            },
            ...regions.map((regione) => ({
              id: regione,
              textValue: regione,
              selected: activeRegion === regione,
              label: <span>{regione}</span>,
            })),
          ]}
          onSelect={(id) => selectRegion(id === ALL_REGIONS_ID ? null : id)}
        />
      </Field>
      {activeRegion != null ? (
        <RegionPanel rows={rowsForRegion(rows, activeRegion)} search={search} onPatch={onPatch} />
      ) : null}
    </>
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
    <>
      {capitals.length > 0 ? (
        <div className="ui-field selector-field-capitals">
          <span className="ui-micro-label">{t('drilldown.capitalLabel')}</span>
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
                className="drilldown-chip"
                data-active={activeCapital === comune ? '' : undefined}
                onClick={() => toggleCapital(comune)}
              >
                {t('drilldown.capitalChip', { comune })}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <SelectField
        label={t('drilldown.provinceLabel')}
        id="drilldown-provincia"
        fieldClassName="selector-field-province"
        value={search.provincia ?? ''}
        onChange={(e) => selectProvince(e.target.value)}
      >
        <option value="">{t('drilldown.allProvinces')}</option>
        {provinces.map((provincia) => (
          <option key={provincia} value={provincia}>
            {provincia}
          </option>
        ))}
      </SelectField>
    </>
  );
}
