// Admin: who may sign the letterhead documents, and under what title.
//
// The gender column is not bookkeeping. In the rinuncia declaration the
// document says "Il sottoscritto" or "La sottoscritta" about this person, so
// the wrong value produces a legal declaration that misgenders the person
// making it — a mistake nobody catches by proofreading a form.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { GENERI, type Firmatario, type Genere } from '@pvp/shared';
import { Button } from '../../components/Button.js';
import { TextInput } from '../../components/TextInput.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { translateApiError } from '../../lib/translateApiError.js';
import { useCartaFirmatari, useResetCartaFirmatari, useSetCartaFirmatari } from '../carta/hooks.js';
import { anagraficaEffettiva, type Anagrafica } from '../carta/utils/anagrafica.js';
import './admin.css';

export function CartaFirmatariScreen() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError, error } = useCartaFirmatari();
  const salva = useSetCartaFirmatari();
  const ripristina = useResetCartaFirmatari();

  const [bozza, setBozza] = useState<Anagrafica | null>(null);
  const [messaggio, setMessaggio] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [conferma, setConferma] = useState(false);

  const salvata = useMemo(() => anagraficaEffettiva(data?.anagrafica), [data]);
  const correnti = bozza ?? salvata;
  const personalizzata = Boolean(data?.anagrafica);

  function aggiorna(next: Anagrafica) {
    setBozza(next);
    setMessaggio(null);
  }

  function cambiaFirmatario(i: number, campo: keyof Firmatario, valore: string) {
    const firmatari = correnti.firmatari.map((f, idx) =>
      idx === i ? { ...f, [campo]: valore } : f,
    );
    aggiorna({ ...correnti, firmatari });
  }

  // Rejected before the request, so the reason names the row: the schema
  // would refuse the same thing with a generic validation error.
  const vuoti = correnti.firmatari.some((f) => !f.nome.trim() || !f.carica.trim());
  const qualificheVuote = correnti.qualifiche.some((q) => !q.trim());

  function invia() {
    setMessaggio(null);
    salva.mutate(
      {
        firmatari: correnti.firmatari.map((f) => ({
          nome: f.nome.trim(),
          carica: f.carica.trim(),
          genere: f.genere,
        })),
        qualifiche: correnti.qualifiche.map((q) => q.trim()),
      },
      {
        onSuccess: () => {
          setBozza(null);
          setMessaggio({ kind: 'success', text: t('firmatari.salvato') });
        },
        onError: (err) =>
          setMessaggio({
            kind: 'error',
            text: translateApiError(t, err, t('firmatari.erroreSalvataggio')),
          }),
      },
    );
  }

  if (isLoading) return <StatusDisplay variant="loading" message={t('firmatari.caricamento')} />;
  if (isError)
    return (
      <StatusDisplay
        variant="error"
        message={translateApiError(t, error, t('firmatari.erroreCaricamento'))}
      />
    );

  return (
    <div className="admin-screen">
      <h1 className="admin-title">{t('firmatari.titolo')}</h1>
      <p className="admin-intro">{t('firmatari.sottotitolo')}</p>
      {personalizzata ? null : <span className="admin-tag">{t('firmatari.diFabbrica')}</span>}

      {messaggio ? (
        <StatusDisplay
          variant={messaggio.kind === 'error' ? 'error' : 'success'}
          message={messaggio.text}
        />
      ) : null}

      <h3 className="admin-sub-title">{t('firmatari.persone')}</h3>
      <div className="admin-firmatari-head">
        <span className="ui-micro-label">{t('firmatari.nome')}</span>
        <span className="ui-micro-label">{t('firmatari.carica')}</span>
        <span className="ui-micro-label">{t('firmatari.genere')}</span>
      </div>
      <div className="admin-firmatari">
        {correnti.firmatari.map((f, i) => (
          <div className="admin-firmatario" key={i}>
            <TextInput
              aria-label={t('firmatari.nome')}
              placeholder={t('firmatari.nome')}
              value={f.nome}
              onChange={(e) => cambiaFirmatario(i, 'nome', e.target.value)}
            />
            <TextInput
              aria-label={t('firmatari.carica')}
              placeholder={t('firmatari.carica')}
              value={f.carica}
              onChange={(e) => cambiaFirmatario(i, 'carica', e.target.value)}
            />
            {/* A bare select with an aria-label, not a SelectField: repeated
                down every row its visible label became a column of the word
                "Sesso" rather than a heading. The name is still there for
                anyone reading the row with a screen reader. */}
            <span className="ui-select-wrap">
              <select
                className="ui-select"
                aria-label={`${t('firmatari.genere')} — ${f.nome || t('firmatari.nome')}`}
                value={f.genere}
                onChange={(e) => cambiaFirmatario(i, 'genere', e.target.value as Genere)}
              >
                {GENERI.map((g) => (
                  <option key={g} value={g}>
                    {t(`firmatari.generi.${g}`)}
                  </option>
                ))}
              </select>
            </span>
            <Button
              severity="secondary"
              aria-label={t('firmatari.rimuovi')}
              onClick={() =>
                aggiorna({
                  ...correnti,
                  firmatari: correnti.firmatari.filter((_, idx) => idx !== i),
                })
              }
            >
              <Trash2 aria-hidden="true" size={15} />
            </Button>
          </div>
        ))}
      </div>
      <Button
        severity="secondary"
        onClick={() =>
          aggiorna({
            ...correnti,
            firmatari: [...correnti.firmatari, { nome: '', carica: '', genere: 'M' }],
          })
        }
      >
        <Plus aria-hidden="true" size={15} />
        {t('firmatari.aggiungiPersona')}
      </Button>

      <h3 className="admin-sub-title">{t('firmatari.qualifiche')}</h3>
      <p className="admin-intro">{t('firmatari.qualificheAiuto')}</p>
      <div className="admin-firmatari">
        {correnti.qualifiche.map((q, i) => (
          <div className="admin-qualifica" key={i}>
            <TextInput
              aria-label={t('firmatari.qualifica')}
              value={q}
              onChange={(e) =>
                aggiorna({
                  ...correnti,
                  qualifiche: correnti.qualifiche.map((x, idx) => (idx === i ? e.target.value : x)),
                })
              }
            />
            <Button
              severity="secondary"
              aria-label={t('firmatari.rimuovi')}
              onClick={() =>
                aggiorna({
                  ...correnti,
                  qualifiche: correnti.qualifiche.filter((_, idx) => idx !== i),
                })
              }
            >
              <Trash2 aria-hidden="true" size={15} />
            </Button>
          </div>
        ))}
      </div>
      <Button
        severity="secondary"
        onClick={() => aggiorna({ ...correnti, qualifiche: [...correnti.qualifiche, ''] })}
      >
        <Plus aria-hidden="true" size={15} />
        {t('firmatari.aggiungiQualifica')}
      </Button>

      {vuoti || qualificheVuote ? (
        <StatusDisplay variant="empty" message={t('firmatari.righeVuote')} />
      ) : null}

      <div className="admin-row-actions">
        <Button onClick={invia} disabled={salva.isPending || vuoti || qualificheVuote || !bozza}>
          {salva.isPending ? t('firmatari.salvataggio') : t('firmatari.salva')}
        </Button>
        <Button severity="secondary" onClick={() => setBozza(null)} disabled={!bozza}>
          {t('firmatari.annulla')}
        </Button>
        {personalizzata ? (
          <Button severity="secondary" onClick={() => setConferma(true)}>
            {t('firmatari.ripristina')}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={conferma}
        title={t('firmatari.ripristinaTitolo')}
        description={t('firmatari.ripristinaCorpo')}
        confirmLabel={t('firmatari.ripristina')}
        onConfirm={() => {
          setConferma(false);
          ripristina.mutate(undefined, {
            onSuccess: () => {
              setBozza(null);
              setMessaggio({ kind: 'success', text: t('firmatari.ripristinato') });
            },
            onError: (err) =>
              setMessaggio({
                kind: 'error',
                text: translateApiError(t, err, t('firmatari.erroreSalvataggio')),
              }),
          });
        }}
        onOpenChange={setConferma}
      />
    </div>
  );
}
