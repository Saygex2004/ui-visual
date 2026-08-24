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
import { formatTimestamp } from '../dashboard/DataTable/formatting.js';
import { PraticaForm } from './PraticaForm.js';
import { useDeletePratica, useUpdatePratica } from './hooks.js';

export interface PraticaWindowProps {
  pratica: Pratica;
  utenti: { id: string; username: string }[];
  veicoliNoti: string[];
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
  veicoliNoti,
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
                veicoliNoti={veicoliNoti}
                submitting={update.isPending}
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <dl className="pratiche-window-list">
                  <Riga label={t('fields.ndg')} value={pratica.ndg} />
                  <Riga label={t('fields.numeroPratica')} value={pratica.numero_pratica} />
                  <Riga label={t('fields.veicolo')} value={show(pratica.veicolo)} />
                  <div className="pratiche-window-row">
                    <dt>{t('fields.estinto')}</dt>
                    <dd>
                      <Badge variant={pratica.estinto ? 'success' : 'neutral'}>
                        {pratica.estinto ? t('common.si') : t('common.no')}
                      </Badge>
                    </dd>
                  </div>
                  <Riga
                    label={t('fields.scatola')}
                    value={pratica.n_scatola == null ? vuoto : String(pratica.n_scatola)}
                  />
                  <Riga label={t('fields.plurima')} value={show(pratica.plurima_riscontro)} />
                  <Riga
                    label={t('fields.ordinatoDa')}
                    value={show(nomeUtente(pratica.ordinato_da))}
                  />
                  <Riga label={t('fields.note')} value={show(pratica.note)} />
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
