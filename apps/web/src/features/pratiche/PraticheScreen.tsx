// The admin-only "Pratiche" view: filter bar, table, Excel export, and the
// per-row window. The table shows `filterPratiche(...)` and the export
// serializes the same array — the export therefore always means "what I am
// looking at", which is the whole point of having filters next to it.
import { useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Download, Plus, Search } from 'lucide-react';
import { STATI_PRATICA, type Pratica, type PraticaInput, type StatoPratica } from '@pvp/shared';
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
import { formatDate } from '../dashboard/DataTable/formatting.js';
import { usePratiche, useCreatePratica } from './hooks.js';
import { PraticaForm } from './PraticaForm.js';
import { PraticaWindow } from './PraticaWindow.js';
import {
  CAMPI_DATA,
  EMPTY_FILTERS,
  etichettaMese,
  filterPratiche,
  formatEuro,
  inRitardo,
  mesiPresenti,
  portafogliPresenti,
  type CampoData,
  type PraticheFilters,
} from './praticheData.js';
import { praticheToXlsx, xlsxFilename } from './praticheXlsx.js';
import './pratiche.css';

/** Each date's label key. Spelled out rather than derived from the field
 *  name: the existing keys are not consistent with each other
 *  ("dataRichiesta" but "consegnaPrevista"), so a transform would silently
 *  produce a missing key for half of them. The filter names each date exactly
 *  as its column does. */
const ETICHETTA_DATA: Record<CampoData, string> = {
  data_richiesta: 'dataRichiesta',
  data_spedizione: 'dataSpedizione',
  data_consegna_prevista: 'consegnaPrevista',
  data_consegna_effettiva: 'consegnaEffettiva',
};

function scarica(contenuto: Uint8Array, filename: string, type: string): void {
  // Cast because TypeScript's `BlobPart` does not accept the generic
  // `Uint8Array<ArrayBufferLike>` the lib now infers; a Uint8Array is a valid
  // BlobPart at runtime, which is what the browser cares about.
  const blob = new Blob([contenuto as BlobPart], { type });
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
  // Which window is open lives in the URL, not in component state: that is
  // what gives a single pratica an address a Slack message can link to.
  const { pratica: aperta } = useSearch({ from: '/protected-layout/pratiche' });
  const navigate = useNavigate();
  const setAperta = (id: string | undefined) =>
    void navigate({ to: '/pratiche', search: id ? { pratica: id } : {}, replace: true });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const pratiche = useMemo(() => data?.pratiche ?? [], [data]);
  const utenti = useMemo(() => data?.utenti ?? [], [data]);

  const nomeUtente = useMemo(() => {
    const byId = new Map(utenti.map((u) => [u.id, u.username]));
    return (id: string | null) => (id ? (byId.get(id) ?? id) : '');
  }, [utenti]);

  const portafogli = useMemo(() => portafogliPresenti(pratiche), [pratiche]);
  // Recomputed when the date field changes: the months with a shipping date
  // are not the months with a request date, and offering the wrong ones would
  // leave the user picking a month that can only come back empty.
  const mesi = useMemo(
    () => mesiPresenti(pratiche, filters.campoData),
    [pratiche, filters.campoData],
  );
  // One "today" for the whole render, so every row's late badge agrees.
  const oggi = new Date().toISOString().slice(0, 10);
  const statoLabel = (st: StatoPratica) => t(`stati.${st}`);
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
            onClick={() =>
              scarica(
                praticheToXlsx(visibili, nomeUtente, statoLabel),
                xlsxFilename(new Date()),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              )
            }
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
        {/* The filters are labelled "Filtra per…", not just "Portafoglio"/
            "Stato": the form uses those plain names for its own inputs, and
            two controls sharing an accessible name on one screen is ambiguous
            to anyone navigating by label — screen reader or test alike. */}
        <SelectField
          label={t('filters.portafoglioLabel')}
          id="filtro-portafoglio"
          value={filters.portafoglio}
          onChange={(e) => setFilters((f) => ({ ...f, portafoglio: e.target.value }))}
        >
          <option value="">{t('filters.allPortafogli')}</option>
          {portafogli.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('filters.campoDataLabel')}
          id="filtro-campo-data"
          value={filters.campoData}
          onChange={(e) =>
            // The month is cleared with the field: a month that existed for
            // request dates may not exist for shipping ones, and leaving it
            // set would show an empty table with no clue why.
            setFilters((f) => ({ ...f, campoData: e.target.value as CampoData, mese: '' }))
          }
        >
          {CAMPI_DATA.map((c) => (
            <option key={c} value={c}>
              {t(`fields.${ETICHETTA_DATA[c]}`)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('filters.meseLabel')}
          id="filtro-mese"
          value={filters.mese}
          onChange={(e) => setFilters((f) => ({ ...f, mese: e.target.value }))}
          disabled={mesi.length === 0}
        >
          <option value="">{t('filters.allMesi')}</option>
          {mesi.map((m) => (
            <option key={m} value={m}>
              {etichettaMese(m)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('filters.statoLabel')}
          id="filtro-stato"
          value={filters.stato}
          onChange={(e) =>
            setFilters((f) => ({ ...f, stato: e.target.value as PraticheFilters['stato'] }))
          }
        >
          <option value="">{t('filters.allStati')}</option>
          {STATI_PRATICA.map((st) => (
            <option key={st} value={st}>
              {t(`stati.${st}`)}
            </option>
          ))}
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
                <th scope="col">{t('fields.portafoglio')}</th>
                <th scope="col">{t('fields.stato')}</th>
                <th scope="col">{t('fields.dataSpedizione')}</th>
                <th scope="col">{t('fields.consegnaEffettiva')}</th>
                <th scope="col">{t('fields.costoSpedizione')}</th>
                <th scope="col">{t('fields.scatole')}</th>
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
                  <td>{p.portafoglio ?? '—'}</td>
                  <td>
                    <Badge variant="accent">{t(`stati.${p.stato}`)}</Badge>
                    {inRitardo(p, oggi) ? (
                      <Badge variant="danger" className="pratiche-badge-gap">
                        {t('window.ritardo')}
                      </Badge>
                    ) : null}
                  </td>
                  <td>{p.data_spedizione ? formatDate(p.data_spedizione) : '—'}</td>
                  <td>{p.data_consegna_effettiva ? formatDate(p.data_consegna_effettiva) : '—'}</td>
                  <td className="pratiche-cell-num">
                    {p.costo_spedizione_cent == null
                      ? '—'
                      : `€ ${formatEuro(p.costo_spedizione_cent)}`}
                  </td>
                  <td>{p.n_scatole ?? '—'}</td>
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
          portafogliNoti={portafogli}
          nomeUtente={nomeUtente}
          onClose={() => setAperta(undefined)}
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
                portafogliNoti={portafogli}
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
