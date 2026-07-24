// Per-table toolbar (UI §4.2): free-text search, up to 4 native selects
// (compound PrimeReact Select isn't worth it for a single-choice dropdown —
// see HANDOFF_PHASE_4.md), value range, Reset filtri, live count. Free-text
// search is local + debounced then written to the URL via `replace`
// (FRONTEND.md §2: "in-place updates use replace only for keystroke-level
// changes") — every other field pushes a normal history entry so browser
// back/forward walks distinct filter states (UI §2.4). Column choosers are
// populated by the caller from `distinctValues()` (filterModel.ts) over the
// table's full, unfiltered rows — an omitted options array hides that
// chooser entirely (the Archivio toolbar has no column choosers at all,
// UI §9.1: search, value range, reset, sort only).
import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
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
}

function toOptional(value: string): string | undefined {
  return value === '' ? undefined : value;
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

  return (
    <div className="dashboard-toolbar">
      <div className="dashboard-toolbar-field">
        <label htmlFor="toolbar-search">{t('toolbar.searchLabel')}</label>
        <InputText
          id="toolbar-search"
          value={qDraft}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQDraft(e.target.value)}
          placeholder={t('toolbar.searchPlaceholder')}
        />
      </div>

      {tipoOptions ? (
        <div className="dashboard-toolbar-field">
          <label htmlFor="toolbar-tipo">{t('toolbar.tipoLabel')}</label>
          <select
            id="toolbar-tipo"
            value={search.tipo ?? ''}
            onChange={(e) => onPatch({ tipo: toOptional(e.target.value) })}
          >
            <option value="">{t('toolbar.allOption')}</option>
            {tipoOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {proceduraOptions ? (
        <div className="dashboard-toolbar-field">
          <label htmlFor="toolbar-procedura">{t('toolbar.proceduraLabel')}</label>
          <select
            id="toolbar-procedura"
            value={search.procedura ?? ''}
            onChange={(e) => onPatch({ procedura: toOptional(e.target.value) })}
          >
            <option value="">{t('toolbar.allOption')}</option>
            {proceduraOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {disponibilitaOptions && areaKind === 'real_estate' ? (
        <div className="dashboard-toolbar-field">
          <label htmlFor="toolbar-disponibilita">{t('toolbar.disponibilitaLabel')}</label>
          <select
            id="toolbar-disponibilita"
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
          </select>
        </div>
      ) : null}

      {tribunaleOptions ? (
        <div className="dashboard-toolbar-field">
          <label htmlFor="toolbar-tribunale">{t('toolbar.tribunaleLabel')}</label>
          <select
            id="toolbar-tribunale"
            value={search.tribunale ?? ''}
            onChange={(e) => onPatch({ tribunale: toOptional(e.target.value) })}
          >
            <option value="">{t('toolbar.allOption')}</option>
            {tribunaleOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="dashboard-toolbar-field dashboard-toolbar-range">
        <label htmlFor="toolbar-min">{t('toolbar.minLabel')}</label>
        <input
          id="toolbar-min"
          type="number"
          min={0}
          value={search.min ?? ''}
          onChange={(e) =>
            onPatch({ min: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
        <label htmlFor="toolbar-max">{t('toolbar.maxLabel')}</label>
        <input
          id="toolbar-max"
          type="number"
          min={0}
          value={search.max ?? ''}
          onChange={(e) =>
            onPatch({ max: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
      </div>

      <Button type="button" severity="secondary" onClick={onReset}>
        {t('toolbar.resetFilters')}
      </Button>

      <span className="dashboard-toolbar-count" role="status">
        {visibleCount === totalCount
          ? t('toolbar.countTotal', { count: totalCount })
          : t('toolbar.countFiltered', { visible: visibleCount, total: totalCount })}
      </span>
    </div>
  );
}
