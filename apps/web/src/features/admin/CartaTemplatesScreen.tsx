// Admin: edit the boilerplate the letterhead view puts into documents.
//
// The care here is not the saving, it is the {{PLACEHOLDER}} tokens. The
// acquisto body is 5,300 characters of legal text; losing {{CORRISPETTIVO}}
// while rewording a sentence produces documents with no price, and nothing
// downstream would notice. So an edit that drops or misspells a token is
// named before it is saved.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TIPI_TEMPLATE, type TipoTemplate } from '@pvp/shared';
import { Button } from '../../components/Button.js';
import { SelectField } from '../../components/SelectField.js';
import { Field } from '../../components/Field.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { translateApiError } from '../../lib/translateApiError.js';
import { useCartaTemplates, useResetCartaTemplate, useSetCartaTemplate } from '../carta/hooks.js';
import {
  testiDiFabbrica,
  testiEffettivi,
  type TestiLettera,
} from '../carta/utils/testiEffettivi.js';
import { SEGNAPOSTO_VALIDI, controllaSegnaposto, daConfermare } from '../carta/utils/segnaposto.js';
import './admin.css';

export function CartaTemplatesScreen() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError, error } = useCartaTemplates();
  const salva = useSetCartaTemplate();
  const ripristina = useResetCartaTemplate();

  const [tipo, setTipo] = useState<TipoTemplate>('proposta');
  const [bozza, setBozza] = useState<TestiLettera | null>(null);
  const [messaggio, setMessaggio] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [conferma, setConferma] = useState(false);

  const overrides = useMemo(() => data?.templates ?? [], [data]);
  const salvati = useMemo(() => testiEffettivi(tipo, overrides), [tipo, overrides]);
  const correnti = bozza ?? salvati;
  const modificato = overrides.some((o) => o.tipo === tipo);

  // Compared against what is saved, not against the shipped default: the
  // question is what THIS edit changes, not how far the text has drifted
  // from the original.
  const esito = useMemo(
    () => controllaSegnaposto(salvati.corpo, correnti.corpo),
    [salvati.corpo, correnti.corpo],
  );

  function cambiaTipo(nuovo: TipoTemplate) {
    setTipo(nuovo);
    setBozza(null);
    setMessaggio(null);
  }

  function aggiorna(campo: keyof TestiLettera, valore: string) {
    setBozza({ ...correnti, [campo]: valore });
    setMessaggio(null);
  }

  function esegui() {
    setConferma(false);
    salva.mutate(
      { tipo, body: correnti },
      {
        onSuccess: () => {
          setBozza(null);
          setMessaggio({ kind: 'success', text: t('cartaTemplate.saved') });
        },
        onError: (err) =>
          setMessaggio({
            kind: 'error',
            text: translateApiError(t, err, t('cartaTemplate.saveError')),
          }),
      },
    );
  }

  if (isLoading) return <StatusDisplay variant="loading" message={t('cartaTemplate.loading')} />;
  if (isError)
    return (
      <StatusDisplay
        variant="error"
        message={translateApiError(t, error, t('cartaTemplate.loadError'))}
      />
    );

  return (
    <div className="admin-screen">
      <h1 className="admin-title">{t('cartaTemplate.title')}</h1>
      <p className="admin-intro">{t('cartaTemplate.intro')}</p>

      <SelectField
        label={t('cartaTemplate.tipo')}
        id="tpl-tipo"
        value={tipo}
        onChange={(e) => cambiaTipo(e.target.value as TipoTemplate)}
      >
        {TIPI_TEMPLATE.map((x) => (
          <option key={x} value={x}>
            {t(`cartaTemplate.tipi.${x}`)}
          </option>
        ))}
      </SelectField>

      <p className="admin-intro">
        {modificato ? t('cartaTemplate.isOverridden') : t('cartaTemplate.isDefault')}
      </p>

      {messaggio ? (
        <StatusDisplay
          variant={messaggio.kind === 'error' ? 'error' : 'success'}
          message={messaggio.text}
        />
      ) : null}

      {esito.rimossi.length > 0 ? (
        <StatusDisplay
          variant="error"
          message={t('cartaTemplate.removed', { campi: esito.rimossi.join(', ') })}
        />
      ) : null}
      {esito.sconosciuti.length > 0 ? (
        <StatusDisplay
          variant="error"
          message={t('cartaTemplate.unknown', { campi: esito.sconosciuti.join(', ') })}
        />
      ) : null}
      {esito.aggiunti.length > 0 ? (
        <StatusDisplay
          variant="info"
          message={t('cartaTemplate.added', { campi: esito.aggiunti.join(', ') })}
        />
      ) : null}

      <Field label={t('cartaTemplate.apertura')} htmlFor="tpl-apertura">
        <textarea
          id="tpl-apertura"
          className="admin-textarea"
          rows={2}
          value={correnti.apertura}
          onChange={(e) => aggiorna('apertura', e.target.value)}
        />
      </Field>

      <Field label={t('cartaTemplate.corpo')} htmlFor="tpl-corpo">
        <textarea
          id="tpl-corpo"
          className="admin-textarea admin-textarea-mono"
          rows={18}
          value={correnti.corpo}
          onChange={(e) => aggiorna('corpo', e.target.value)}
        />
      </Field>

      <Field label={t('cartaTemplate.chiusura')} htmlFor="tpl-chiusura">
        <textarea
          id="tpl-chiusura"
          className="admin-textarea"
          rows={3}
          value={correnti.chiusura}
          onChange={(e) => aggiorna('chiusura', e.target.value)}
        />
      </Field>

      <details className="admin-segnaposto">
        <summary>{t('cartaTemplate.available')}</summary>
        <ul>
          {SEGNAPOSTO_VALIDI.map((s) => (
            <li key={s}>
              <code>{`{{${s}}}`}</code>
            </li>
          ))}
        </ul>
      </details>

      <div className="admin-row-actions">
        <Button
          onClick={() => (daConfermare(esito) ? setConferma(true) : esegui())}
          disabled={salva.isPending || bozza === null}
        >
          {salva.isPending ? t('cartaTemplate.saving') : t('cartaTemplate.save')}
        </Button>
        <Button severity="secondary" onClick={() => setBozza(null)} disabled={bozza === null}>
          {t('cartaTemplate.discard')}
        </Button>
        {modificato ? (
          <Button
            severity="danger"
            onClick={() =>
              ripristina.mutate(tipo, {
                onSuccess: () => {
                  setBozza(null);
                  setMessaggio({ kind: 'success', text: t('cartaTemplate.reset') });
                },
              })
            }
            disabled={ripristina.isPending}
          >
            {t('cartaTemplate.resetAction')}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={conferma}
        onOpenChange={setConferma}
        title={t('cartaTemplate.confirmTitle')}
        description={[
          esito.rimossi.length
            ? t('cartaTemplate.removed', { campi: esito.rimossi.join(', ') })
            : '',
          esito.sconosciuti.length
            ? t('cartaTemplate.unknown', { campi: esito.sconosciuti.join(', ') })
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        confirmLabel={t('cartaTemplate.confirmSave')}
        destructive
        onConfirm={esegui}
      />
    </div>
  );
}

/** Shipped text, exported for the "what changed" comparison in tests. */
export { testiDiFabbrica };
