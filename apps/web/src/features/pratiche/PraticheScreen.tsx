// The admin-only "Pratiche" view: filter bar, table, CSV export, and the
// per-row window. The table shows `filterPratiche(...)` and the export
// serializes the same array — the export therefore always means "what I am
// looking at", which is the whole point of having filters next to it.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Plus, Search } from 'lucide-react';
import type { Pratica, PraticaInput } from '@pvp/shared';
import { TextInput } from '../../components/TextInput.js';
import { SelectField } from '../../components/SelectField.js';
import { Button } from '../../components/Button.js';
import { Badge } from '../../components/Badge.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from '../../components/Dialog.js';
import { translateApiError } from '../../lib/translateApiError.js';
import { usePratiche, useCreatePratica } from './hooks.js';
import { PraticaForm } from './PraticaForm.js';
import { PraticaWindow } from './PraticaWindow.js';
import {
  EMPTY_FILTERS,
  csvFilename,
  filterPratiche,
  praticheToCsv,
  veicoliPresenti,
  type PraticheFilters,
} from './praticheData.js';
import './pratiche.css';

function scaricaCsv(contenuto: string, filename: string): void {
  // text/csv with an explicit utf-8 charset: the BOM in the payload tells
  // Excel, this tells the browser, and disagreeing about it is how a download
  // ends up named .txt.
  const blob = new Blob([contenuto], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PraticheScreen() {
  const { t } = useTranslation('pratiche');
  const { data, isLoading, isError, error } = usePratiche();
  const create = useCreatePratica();
  const [filters, setFilters] = useState<PraticheFilters>(EMPTY_FILTERS);
  const [aperta, setAperta] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const pratiche = useMemo(() => data?.pratiche ?? [], [data]);
  const utenti = useMemo(() => data?.utenti ?? [], [data]);

  const nomeUtente = useMemo(() => {
    const byId = new Map(utenti.map((u) => [u.id, u.username]));
    return (id: string | null) => (id ? (byId.get(id) ?? id) : '');
  }, [utenti]);

  const veicoli = useMemo(() => veicoliPresenti(pratiche), [pratiche]);
  const visibili = useMemo(
    () => filterPratiche(pratiche, filters, nomeUtente),
    [pratiche, filters, nomeUtente],
  );

  // Resolved from the live list, not captured when the row was clicked: after
  // an edit the query refetches, and a captured copy would keep showing the
  // pre-edit values behind the user's own change.
  const praticaAperta: Pratica | undefined = aperta
    ? (visibili.find((p) => p.id === aperta) ?? pratiche.find((p) => p.id === aperta))
    : undefined;

  function handleCreate(input: PraticaInput) {
    setCreateError(null);
    create.mutate(input, {
      onSuccess: () => setCreating(false),
      onError: (err) => setCreateError(translateApiError(t, err, t('errors.createFailed'))),
    });
  }

  return (
    <div className="pratiche-screen">
      <header className="pratiche-header">
        <div>
          <h1 className="pratiche-title">{t('title')}</h1>
          <p className="pratiche-subtitle">{t('subtitle')}</p>
        </div>
        <div className="pratiche-header-actions">
          <Button
            severity="secondary"
            onClick={() => scaricaCsv(praticheToCsv(visibili, nomeUtente), csvFilename(new Date()))}
            disabled={visibili.length === 0}
          >
            <Download aria-hidden="true" size={15} />
            {t('actions.export', { count: visibili.length })}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" size={15} />
            {t('actions.new')}
          </Button>
        </div>
      </header>

      <div className="pratiche-filters">
        <div className="pratiche-search">
          <Search aria-hidden="true" size={15} className="pratiche-search-icon" />
          <TextInput
            aria-label={t('filters.searchLabel')}
            placeholder={t('filters.searchPlaceholder')}
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
        {/* The filters are labelled "Filtra per…", not just "Veicolo"/"Estinto":
            the form uses those plain names for its own inputs, and two
            controls sharing an accessible name on one screen is ambiguous to
            anyone navigating by label — screen reader or test alike. */}
        <SelectField
          label={t('filters.veicoloLabel')}
          id="filtro-veicolo"
          value={filters.veicolo}
          onChange={(e) => setFilters((f) => ({ ...f, veicolo: e.target.value }))}
        >
          <option value="">{t('filters.allVehicles')}</option>
          {veicoli.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('filters.estintoLabel')}
          id="filtro-estinto"
          value={filters.estinto}
          onChange={(e) =>
            setFilters((f) => ({ ...f, estinto: e.target.value as PraticheFilters['estinto'] }))
          }
        >
          <option value="tutte">{t('filters.allStates')}</option>
          <option value="si">{t('common.si')}</option>
          <option value="no">{t('common.no')}</option>
        </SelectField>
      </div>

      {isLoading ? <StatusDisplay variant="loading" message={t('states.loading')} /> : null}
      {isError ? (
        <StatusDisplay
          variant="error"
          message={translateApiError(t, error, t('states.loadError'))}
        />
      ) : null}
      {!isLoading && !isError && pratiche.length === 0 ? (
        <StatusDisplay variant="empty" message={t('states.empty')} />
      ) : null}
      {!isLoading && !isError && pratiche.length > 0 && visibili.length === 0 ? (
        <StatusDisplay variant="empty" message={t('states.noMatches')} />
      ) : null}

      {visibili.length > 0 ? (
        <div className="pratiche-table-wrap">
          <table className="pratiche-table">
            <caption className="ui-visually-hidden">{t('tableCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('fields.ndg')}</th>
                <th scope="col">{t('fields.numeroPratica')}</th>
                <th scope="col">{t('fields.veicolo')}</th>
                <th scope="col">{t('fields.estinto')}</th>
                <th scope="col">{t('fields.scatola')}</th>
                <th scope="col">{t('fields.plurima')}</th>
                <th scope="col">{t('fields.ordinatoDa')}</th>
              </tr>
            </thead>
            <tbody>
              {visibili.map((p) => (
                <tr key={p.id}>
                  <td>
                    {/* A button, not a clickable <tr>: the row has to be
                        reachable and activatable from the keyboard, and a
                        real button gets that for free. */}
                    <button
                      type="button"
                      className="pratiche-row-open"
                      onClick={() => setAperta(p.id)}
                    >
                      {p.ndg}
                    </button>
                  </td>
                  <td>{p.numero_pratica}</td>
                  <td>{p.veicolo ?? '—'}</td>
                  <td>
                    <Badge variant={p.estinto ? 'success' : 'neutral'}>
                      {p.estinto ? t('common.si') : t('common.no')}
                    </Badge>
                  </td>
                  <td>{p.n_scatola ?? '—'}</td>
                  <td>{p.plurima_riscontro ?? '—'}</td>
                  <td>{nomeUtente(p.ordinato_da) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {praticaAperta ? (
        <PraticaWindow
          pratica={praticaAperta}
          utenti={utenti}
          veicoliNoti={veicoli}
          nomeUtente={nomeUtente}
          onClose={() => setAperta(null)}
        />
      ) : null}

      <DialogRoot
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setCreateError(null);
        }}
      >
        <DialogPortal>
          <DialogOverlay className="pratiche-window-backdrop" />
          <DialogContent className="pratiche-window">
            <div className="pratiche-window-header">
              <DialogTitle className="pratiche-window-title">{t('actions.new')}</DialogTitle>
            </div>
            <div className="pratiche-window-content">
              {createError ? <StatusDisplay variant="error" message={createError} /> : null}
              <PraticaForm
                utenti={utenti}
                veicoliNoti={veicoli}
                submitting={create.isPending}
                onSubmit={handleCreate}
                onCancel={() => setCreating(false)}
              />
            </div>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </div>
  );
}
