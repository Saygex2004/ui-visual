// The "window" for one pratica: a modal that shows the full record and, on
// request, turns into the edit form in place. Same Radix Dialog primitive the
// listing scheda uses (WorkspacePanel.tsx), so focus trap, Esc-close and
// scroll-lock behave identically across the app.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Pratica, PraticaInput } from '@pvp/shared';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '../../components/Dialog.js';
import { Badge } from '../../components/Badge.js';
import { Button } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { translateApiError } from '../../lib/translateApiError.js';
import { formatDate, formatTimestamp } from '../dashboard/DataTable/formatting.js';
import { PraticaForm } from './PraticaForm.js';
import { useDeletePratica, useUpdatePratica } from './hooks.js';
import { formatEuro, inRitardo } from './praticheData.js';

export interface PraticaWindowProps {
  pratica: Pratica;
  utenti: { id: string; username: string }[];
  portafogliNoti: string[];
  nomeUtente: (id: string | null) => string;
  onClose: () => void;
}

function Riga({ label, value }: { label: string; value: string }) {
  return (
    <div className="pratiche-window-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function PraticaWindow({
  pratica,
  utenti,
  portafogliNoti,
  nomeUtente,
  onClose,
}: PraticaWindowProps) {
  const { t } = useTranslation('pratiche');
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const update = useUpdatePratica();
  const remove = useDeletePratica();

  const vuoto = t('common.assente');
  const show = (v: string | null) => (v == null || v === '' ? vuoto : v);
  // "Today" from the browser clock, formatted as the dates are stored, so the
  // late check compares like with like (see inRitardo).
  const ritardo = inRitardo(pratica, new Date().toISOString().slice(0, 10));
  // formatDate already answers "N/D" for an absent date, which is the same
  // job `show` does for text — so dates go through it directly.
  const data = (v: string | null) => (v == null ? vuoto : formatDate(v));

  function handleSave(input: PraticaInput) {
    setErrorMessage(null);
    update.mutate(
      { id: pratica.id, body: input },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setErrorMessage(translateApiError(t, err, t('errors.saveFailed'))),
      },
    );
  }

  function handleDelete() {
    setErrorMessage(null);
    remove.mutate(pratica.id, {
      onSuccess: onClose,
      onError: (err) => {
        setConfirmingDelete(false);
        setErrorMessage(translateApiError(t, err, t('errors.deleteFailed')));
      },
    });
  }

  return (
    <DialogRoot
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="pratiche-window-backdrop" />
        <DialogContent className="pratiche-window">
          <div className="pratiche-window-header">
            <div className="pratiche-window-heading">
              <span className="ui-micro-label">
                {t('fields.ndg')} {pratica.ndg}
              </span>
              <DialogTitle className="pratiche-window-title">
                {t('window.title', { numero: pratica.numero_pratica })}
              </DialogTitle>
            </div>
            <DialogClose className="pratiche-window-close" aria-label={t('window.close')}>
              <X aria-hidden="true" size={18} />
            </DialogClose>
          </div>

          <div className="pratiche-window-content">
            {errorMessage ? <StatusDisplay variant="error" message={errorMessage} /> : null}

            {editing ? (
              <PraticaForm
                initial={pratica}
                utenti={utenti}
                portafogliNoti={portafogliNoti}
                submitting={update.isPending}
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <dl className="pratiche-window-list">
                  <Riga label={t('fields.ndg')} value={pratica.ndg} />
                  <Riga label={t('fields.numeroPratica')} value={pratica.numero_pratica} />
                  <Riga label={t('fields.portafoglio')} value={show(pratica.portafoglio)} />
                  <div className="pratiche-window-row">
                    <dt>{t('fields.stato')}</dt>
                    <dd>
                      <Badge variant="accent">{t(`stati.${pratica.stato}`)}</Badge>
                      {ritardo ? (
                        <Badge variant="danger" className="pratiche-badge-gap">
                          {t('window.ritardo')}
                        </Badge>
                      ) : null}
                    </dd>
                  </div>
                  <Riga label={t('fields.scatole')} value={show(pratica.n_scatole)} />
                  <Riga
                    label={t('fields.ordinatoDa')}
                    value={show(nomeUtente(pratica.ordinato_da))}
                  />
                  <Riga label={t('fields.note')} value={show(pratica.note)} />
                </dl>

                <dl className="pratiche-window-list">
                  <div className="pratiche-window-row">
                    <dt className="pratiche-window-section">{t('window.sezioneLogistica')}</dt>
                    <dd />
                  </div>
                  <Riga label={t('fields.dataRichiesta')} value={data(pratica.data_richiesta)} />
                  <Riga label={t('fields.dataSpedizione')} value={data(pratica.data_spedizione)} />
                  <Riga
                    label={t('fields.consegnaPrevista')}
                    value={data(pratica.data_consegna_prevista)}
                  />
                  <Riga
                    label={t('fields.consegnaEffettiva')}
                    value={data(pratica.data_consegna_effettiva)}
                  />
                  <Riga
                    label={t('fields.costoSpedizione')}
                    value={
                      pratica.costo_spedizione_cent == null
                        ? vuoto
                        : `€ ${formatEuro(pratica.costo_spedizione_cent)}`
                    }
                  />
                </dl>

                <p className="pratiche-window-meta">
                  {t('window.createdAt', { when: formatTimestamp(pratica.created_at) })}
                  {pratica.updated_at
                    ? ` · ${t('window.updatedAt', { when: formatTimestamp(pratica.updated_at) })}`
                    : ''}
                </p>

                <div className="pratiche-window-actions">
                  <Button severity="secondary" onClick={() => setEditing(true)}>
                    {t('window.edit')}
                  </Button>
                  <Button
                    severity="danger"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={remove.isPending}
                  >
                    {t('window.delete')}
                  </Button>
                </div>
              </>
            )}
          </div>

          <ConfirmDialog
            open={confirmingDelete}
            onOpenChange={setConfirmingDelete}
            title={t('window.deleteConfirmTitle')}
            description={t('window.deleteConfirmBody', { numero: pratica.numero_pratica })}
            confirmLabel={t('window.delete')}
            destructive
            onConfirm={handleDelete}
          />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
