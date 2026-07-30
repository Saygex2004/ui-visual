// Per-table toolbar (UI §4.2, redesigned in Execution Plan Phase 13):
// labeled filter fields (micro-label voice) in one row — free-text search
// with icon, up to 4 native selects, value range — then an active-filter
// footer: removable chips (one per active filter, drill-down state
// included so it's visibly clearable), "Reset filtri" only when something
// is active, the live count at the right. Free-text search is local +
// debounced then written to the URL via `replace` (FRONTEND.md §2:
// "in-place updates use replace only for keystroke-level changes") — every
// other field pushes a normal history entry so browser back/forward walks
// distinct filter states (UI §2.4). Column choosers are populated by the
// caller from `distinctValues()` (filterModel.ts) over the table's full,
// unfiltered rows — an omitted options array hides that chooser entirely
// (the Archivio toolbar has no column choosers at all, UI §9.1).
import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw, Search } from 'lucide-react';
import { TextInput } from '../../../components/TextInput.js';
import { Button } from '../../../components/Button.js';
import { Field } from '../../../components/Field.js';
import { SelectField } from '../../../components/SelectField.js';
import { Chip } from '../../../components/Chip.js';
import { formatCurrency } from './formatting.js';
import type { AreaSearch } from '../urlState.js';
import type { AreaTableKind } from './columns.js';

const SEARCH_DEBOUNCE_MS = 300;

export interface ToolbarProps {
  areaKind: AreaTableKind;
  search: AreaSearch;
  onPatch: (patch: Partial<AreaSearch>, opts?: { replace?: boolean }) => void;
  onReset: () => void;
  visibleCount: number;
  totalCount: number;
  tipoOptions?: readonly string[];
  proceduraOptions?: readonly string[];
  disponibilitaOptions?: readonly string[];
  tribunaleOptions?: readonly string[];
  /** Chips for regione/capoluogo/provincia — only where the geographic
   *  filters actually apply (not the Archivio, UI §9.1). */
  showGeoChips?: boolean;
}

function toOptional(value: string): string | undefined {
  return value === '' ? undefined : value;
}

interface ChipEntry {
  id: string;
  labelKey: string;
  value: string;
  patch: Partial<AreaSearch>;
}

function activeChips(search: AreaSearch, showGeo: boolean): ChipEntry[] {
  const chips: ChipEntry[] = [];
  if (search.q)
    chips.push({ id: 'q', labelKey: 'toolbar.chip.q', value: search.q, patch: { q: undefined } });
  if (search.tipo)
    chips.push({
      id: 'tipo',
      labelKey: 'toolbar.chip.tipo',
      value: search.tipo,
      patch: { tipo: undefined },
    });
  if (search.procedura)
    chips.push({
      id: 'procedura',
      labelKey: 'toolbar.chip.procedura',
      value: search.procedura,
      patch: { procedura: undefined },
    });
  if (search.disponibilita)
    chips.push({
      id: 'disponibilita',
      labelKey: 'toolbar.chip.disponibilita',
      value: search.disponibilita,
      patch: { disponibilita: undefined },
    });
  if (search.tribunale)
    chips.push({
      id: 'tribunale',
      labelKey: 'toolbar.chip.tribunale',
      value: search.tribunale,
      patch: { tribunale: undefined },
    });
  if (search.min != null)
    chips.push({
      id: 'min',
      labelKey: 'toolbar.chip.min',
      value: formatCurrency(search.min),
      patch: { min: undefined },
    });
  if (search.max != null)
    chips.push({
      id: 'max',
      labelKey: 'toolbar.chip.max',
      value: formatCurrency(search.max),
      patch: { max: undefined },
    });
  if (showGeo) {
    if (search.regione)
      chips.push({
        id: 'regione',
        labelKey: 'toolbar.chip.regione',
        value: search.regione,
        patch: { regione: undefined, capoluogo: undefined, provincia: undefined },
      });
    if (search.capoluogo)
      chips.push({
        id: 'capoluogo',
        labelKey: 'toolbar.chip.capoluogo',
        value: search.capoluogo,
        patch: { capoluogo: undefined },
      });
    if (search.provincia)
      chips.push({
        id: 'provincia',
        labelKey: 'toolbar.chip.provincia',
        value: search.provincia,
        patch: { provincia: undefined },
      });
  }
  if (search.blocco)
    chips.push({
      id: 'blocco',
      labelKey: 'toolbar.chip.blocco',
      value: search.blocco,
      patch: { blocco: undefined },
    });
  return chips;
}

export function Toolbar({
  areaKind,
  search,
  onPatch,
  onReset,
  visibleCount,
  totalCount,
  tipoOptions,
  proceduraOptions,
  disponibilitaOptions,
  tribunaleOptions,
  showGeoChips = false,
}: ToolbarProps) {
  const { t } = useTranslation('dashboard');
  const [qDraft, setQDraft] = useState(search.q ?? '');

  // External changes (Reset filtri, browser back/forward) resync the draft —
  // typing itself never round-trips through the URL before the debounce fires.
  useEffect(() => {
    setQDraft(search.q ?? '');
  }, [search.q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (qDraft !== (search.q ?? '')) {
        onPatch({ q: toOptional(qDraft) }, { replace: true });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [qDraft, search.q, onPatch]);

  const chips = activeChips(search, showGeoChips);

  return (
    <div className="dashboard-toolbar">
      <div className="dashboard-toolbar-fields">
        <Field
          label={t('toolbar.searchLabel')}
          htmlFor="toolbar-search"
          className="dashboard-toolbar-search-field"
        >
          <span className="dashboard-toolbar-search">
            <Search aria-hidden="true" size={14} className="dashboard-toolbar-search-icon" />
            <TextInput
              id="toolbar-search"
              value={qDraft}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQDraft(e.target.value)}
              placeholder={t('toolbar.searchPlaceholder')}
            />
          </span>
        </Field>

        {tipoOptions ? (
          <SelectField
            label={t('toolbar.tipoLabel')}
            id="toolbar-tipo"
            fieldClassName="dashboard-toolbar-select"
            value={search.tipo ?? ''}
            onChange={(e) => onPatch({ tipo: toOptional(e.target.value) })}
          >
            <option value="">{t('toolbar.allOption')}</option>
            {tipoOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </SelectField>
        ) : null}

        {proceduraOptions ? (
          <SelectField
            label={t('toolbar.proceduraLabel')}
            id="toolbar-procedura"
            fieldClassName="dashboard-toolbar-select"
            value={search.procedura ?? ''}
            onChange={(e) => onPatch({ procedura: toOptional(e.target.value) })}
          >
            <option value="">{t('toolbar.allOption')}</option>
            {proceduraOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </SelectField>
        ) : null}

        {disponibilitaOptions && areaKind === 'real_estate' ? (
          <SelectField
            label={t('toolbar.disponibilitaLabel')}
            id="toolbar-disponibilita"
            fieldClassName="dashboard-toolbar-select"
            value={search.disponibilita ?? ''}
            onChange={(e) =>
              onPatch({
                disponibilita: toOptional(e.target.value) as AreaSearch['disponibilita'],
              })
            }
          >
            <option value="">{t('toolbar.allOption')}</option>
            {disponibilitaOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </SelectField>
        ) : null}

        {tribunaleOptions ? (
          <SelectField
            label={t('toolbar.tribunaleLabel')}
            id="toolbar-tribunale"
            fieldClassName="dashboard-toolbar-select"
            value={search.tribunale ?? ''}
            onChange={(e) => onPatch({ tribunale: toOptional(e.target.value) })}
          >
            <option value="">{t('toolbar.allOption')}</option>
            {tribunaleOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </SelectField>
        ) : null}

        <Field
          label={t('toolbar.minLabel')}
          htmlFor="toolbar-min"
          className="dashboard-toolbar-number"
        >
          <input
            id="toolbar-min"
            type="number"
            min={0}
            value={search.min ?? ''}
            onChange={(e) =>
              onPatch({ min: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </Field>
        <Field
          label={t('toolbar.maxLabel')}
          htmlFor="toolbar-max"
          className="dashboard-toolbar-number"
        >
          <input
            id="toolbar-max"
            type="number"
            min={0}
            value={search.max ?? ''}
            onChange={(e) =>
              onPatch({ max: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </Field>
      </div>

      <div className="dashboard-toolbar-footer">
        <div className="dashboard-toolbar-chips">
          {chips.length > 0 ? (
            <>
              {chips.map((chip) => (
                <Chip
                  key={chip.id}
                  chipKey={t(chip.labelKey)}
                  value={chip.value}
                  removeLabel={t('toolbar.chipRemove', { name: t(chip.labelKey) })}
                  onRemove={() => onPatch(chip.patch)}
                />
              ))}
              <Button severity="ghost" size="small" onClick={onReset}>
                <RotateCw aria-hidden="true" size={13} />
                {t('toolbar.resetFilters')}
              </Button>
            </>
          ) : (
            <span className="dashboard-toolbar-nofilters">{t('toolbar.noActiveFilters')}</span>
          )}
        </div>
        <span className="dashboard-toolbar-count" role="status">
          {visibleCount === totalCount
            ? t('toolbar.countTotal', { count: totalCount })
            : t('toolbar.countFiltered', { visible: visibleCount, total: totalCount })}
        </span>
      </div>
    </div>
  );
}
