// Admin: the companies offered by the letterhead view, beyond the ones
// shipped in code.
//
// Two of the fields carry more weight than they look. `usabile_come_mittente`
// decides whether the company can WRITE or only be WRITTEN TO — several are
// added purely for their address and PEC. And the logo is measured in the
// browser when it is chosen: a wordmark scaled into a fixed box is exactly
// how it ends up stretched, so its natural size travels with it.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { CartaAzienda, CreateCartaAziendaRequest } from '@pvp/shared';
import { Button } from '../../components/Button.js';
import { TextInput } from '../../components/TextInput.js';
import { Field } from '../../components/Field.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { translateApiError } from '../../lib/translateApiError.js';
import {
  useCartaAziende,
  useCreaAzienda,
  useAggiornaAzienda,
  useEliminaAzienda,
} from '../carta/hooks.js';
import './admin.css';

/** 300 KB of image. The shipped logos are 11-28 KB, so this is generous —
 *  it exists to keep one oversized upload out of a Firestore document, not
 *  to be a design constraint. */
const LOGO_MAX_BYTES = 300 * 1024;

type Bozza = CreateCartaAziendaRequest;

function vuota(): Bozza {
  return {
    nome: '',
    nome_header: null,
    sottotitolo: null,
    via: null,
    cap: null,
    citta: null,
    pec: null,
    email: null,
    cf: null,
    citta_data: null,
    footer_text: null,
    header_color: null,
    header_size: null,
    logo: null,
    logo_width: null,
    logo_height: null,
    usabile_come_mittente: true,
    stampa_nome_intestazione: true,
  };
}

/** The editable fields only: the bookkeeping (id, who created it, when) is
 *  the server's and must not travel back as if it were an edit. */
function daEsistente(a: CartaAzienda): Bozza {
  const {
    id: _id,
    created_at: _createdAt,
    created_by: _createdBy,
    updated_at: _updatedAt,
    updated_by: _updatedBy,
    ...resto
  } = a;
  return resto;
}

export function CartaAziendeScreen() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError, error } = useCartaAziende();
  const crea = useCreaAzienda();
  const aggiorna = useAggiornaAzienda();
  const elimina = useEliminaAzienda();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [modificaId, setModificaId] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [daEliminare, setDaEliminare] = useState<CartaAzienda | null>(null);

  const aziende = data?.aziende ?? [];
  const salvando = crea.isPending || aggiorna.isPending;

  function set<K extends keyof Bozza>(campo: K, valore: Bozza[K]) {
    setBozza((b) => (b ? { ...b, [campo]: valore } : b));
    setMessaggio(null);
  }

  /** Reads the file AND its natural size, because the document needs both to
   *  place the logo without distorting it. */
  function scegliLogo(file: File) {
    setMessaggio(null);
    if (file.size > LOGO_MAX_BYTES) {
      setMessaggio({ kind: 'error', text: t('aziende.logoTroppoGrande') });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result);
      const img = new Image();
      img.onload = () =>
        setBozza((b) =>
          b
            ? { ...b, logo: dataUri, logo_width: img.naturalWidth, logo_height: img.naturalHeight }
            : b,
        );
      img.onerror = () => setMessaggio({ kind: 'error', text: t('aziende.logoNonLetto') });
      img.src = dataUri;
    };
    reader.onerror = () => setMessaggio({ kind: 'error', text: t('aziende.logoNonLetto') });
    reader.readAsDataURL(file);
  }

  function salva() {
    if (!bozza) return;
    setMessaggio(null);
    const esito = {
      onSuccess: () => {
        setBozza(null);
        setModificaId(null);
        setMessaggio({ kind: 'success', text: t('aziende.salvata') });
      },
      onError: (err: unknown) =>
        setMessaggio({ kind: 'error', text: translateApiError(t, err, t('aziende.erroreSalva')) }),
    };
    if (modificaId) aggiorna.mutate({ id: modificaId, body: bozza }, esito);
    else crea.mutate(bozza, esito);
  }

  if (isLoading) return <StatusDisplay variant="loading" message={t('aziende.caricamento')} />;
  if (isError)
    return (
      <StatusDisplay
        variant="error"
        message={translateApiError(t, error, t('aziende.erroreCaricamento'))}
      />
    );

  return (
    <div className="admin-screen">
      <h1 className="admin-title">{t('aziende.titolo')}</h1>
      <p className="admin-intro">{t('aziende.intro')}</p>

      {messaggio ? (
        <StatusDisplay
          variant={messaggio.kind === 'error' ? 'error' : 'success'}
          message={messaggio.text}
        />
      ) : null}

      {aziende.length === 0 ? (
        <StatusDisplay variant="empty" message={t('aziende.nessuna')} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('aziende.nome')}</th>
                <th>{t('aziende.sede')}</th>
                <th>{t('aziende.uso')}</th>
                <th>{t('aziende.logo')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {aziende.map((a) => (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td>{[a.via, a.cap, a.citta].filter(Boolean).join(', ') || '—'}</td>
                  <td>
                    {a.usabile_come_mittente ? t('aziende.usoEntrambi') : t('aziende.usoSoloDest')}
                  </td>
                  <td>{a.logo ? t('aziende.logoSi') : t('aziende.logoNo')}</td>
                  <td className="admin-row-actions">
                    <Button
                      severity="secondary"
                      onClick={() => {
                        setModificaId(a.id);
                        setBozza(daEsistente(a));
                        setMessaggio(null);
                      }}
                    >
                      {t('aziende.modifica')}
                    </Button>
                    <Button
                      severity="secondary"
                      aria-label={t('aziende.elimina')}
                      onClick={() => setDaEliminare(a)}
                    >
                      <Trash2 aria-hidden="true" size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bozza === null ? (
        <Button
          onClick={() => {
            setModificaId(null);
            setBozza(vuota());
          }}
        >
          <Plus aria-hidden="true" size={15} />
          {t('aziende.aggiungi')}
        </Button>
      ) : (
        <section className="admin-azienda-form">
          <h2 className="admin-form-title">
            {modificaId ? t('aziende.modificaTitolo') : t('aziende.aggiungi')}
          </h2>

          <div className="admin-azienda-grid">
            <Field label={t('aziende.nome')} htmlFor="az-nome">
              <TextInput
                id="az-nome"
                required
                value={bozza.nome}
                onChange={(e) => set('nome', e.target.value)}
              />
            </Field>
            <Field label={t('aziende.nomeHeader')} htmlFor="az-nome-header">
              <TextInput
                id="az-nome-header"
                placeholder={bozza.nome}
                value={bozza.nome_header ?? ''}
                onChange={(e) => set('nome_header', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.via')} htmlFor="az-via">
              <TextInput
                id="az-via"
                value={bozza.via ?? ''}
                onChange={(e) => set('via', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.cap')} htmlFor="az-cap">
              <TextInput
                id="az-cap"
                value={bozza.cap ?? ''}
                onChange={(e) => set('cap', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.citta')} htmlFor="az-citta">
              <TextInput
                id="az-citta"
                value={bozza.citta ?? ''}
                onChange={(e) => set('citta', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.pec')} htmlFor="az-pec">
              <TextInput
                id="az-pec"
                value={bozza.pec ?? ''}
                onChange={(e) => set('pec', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.email')} htmlFor="az-email">
              <TextInput
                id="az-email"
                value={bozza.email ?? ''}
                onChange={(e) => set('email', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.cf')} htmlFor="az-cf">
              <TextInput
                id="az-cf"
                value={bozza.cf ?? ''}
                onChange={(e) => set('cf', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.cittaData')} htmlFor="az-citta-data">
              <TextInput
                id="az-citta-data"
                placeholder={bozza.citta ?? ''}
                value={bozza.citta_data ?? ''}
                onChange={(e) => set('citta_data', e.target.value || null)}
              />
            </Field>
            <Field label={t('aziende.headerColor')} htmlFor="az-colore">
              <TextInput
                id="az-colore"
                placeholder="#1F3864"
                value={bozza.header_color ?? ''}
                onChange={(e) => set('header_color', e.target.value || null)}
              />
            </Field>
          </div>

          <Field label={t('aziende.footer')} htmlFor="az-footer">
            <textarea
              id="az-footer"
              className="admin-textarea"
              rows={2}
              value={bozza.footer_text ?? ''}
              onChange={(e) => set('footer_text', e.target.value || null)}
            />
          </Field>

          {/* The logo is optional and says so: most of the shipped companies
              have none and print their name instead. */}
          <div className="admin-azienda-logo">
            <span className="ui-micro-label">{t('aziende.logo')}</span>
            <p className="admin-intro">{t('aziende.logoAiuto')}</p>
            {bozza.logo ? (
              <div className="admin-azienda-logo-anteprima">
                <img src={bozza.logo} alt={t('aziende.logoAnteprima')} />
                <Button
                  severity="secondary"
                  onClick={() => {
                    set('logo', null);
                    set('logo_width', null);
                    set('logo_height', null);
                  }}
                >
                  {t('aziende.logoTogli')}
                </Button>
              </div>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="ui-visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) scegliLogo(file);
                e.target.value = '';
              }}
            />
            <Button severity="secondary" onClick={() => fileRef.current?.click()}>
              {bozza.logo ? t('aziende.logoCambia') : t('aziende.logoCarica')}
            </Button>
          </div>

          <label className="admin-azienda-mittente">
            <input
              type="checkbox"
              checked={bozza.usabile_come_mittente}
              onChange={(e) => set('usabile_come_mittente', e.target.checked)}
            />
            {t('aziende.usabileMittente')}
          </label>
          <p className="admin-intro">{t('aziende.usabileMittenteAiuto')}</p>

          {/* Only offered when there is no logo: with one, the logo IS the
              header and the name is not printed beside it either way. */}
          {bozza.logo ? null : (
            <>
              <label className="admin-azienda-mittente">
                <input
                  type="checkbox"
                  checked={bozza.stampa_nome_intestazione}
                  onChange={(e) => set('stampa_nome_intestazione', e.target.checked)}
                />
                {t('aziende.stampaNome')}
              </label>
              <p className="admin-intro">{t('aziende.stampaNomeAiuto')}</p>
            </>
          )}

          <div className="admin-row-actions">
            <Button onClick={salva} disabled={salvando || bozza.nome.trim() === ''}>
              {salvando ? t('aziende.salvataggio') : t('aziende.salva')}
            </Button>
            <Button
              severity="secondary"
              onClick={() => {
                setBozza(null);
                setModificaId(null);
                setMessaggio(null);
              }}
            >
              {t('aziende.annulla')}
            </Button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={daEliminare !== null}
        title={t('aziende.eliminaTitolo')}
        description={t('aziende.eliminaCorpo', { nome: daEliminare?.nome ?? '' })}
        confirmLabel={t('aziende.elimina')}
        destructive
        onConfirm={() => {
          const id = daEliminare?.id;
          setDaEliminare(null);
          if (!id) return;
          elimina.mutate(id, {
            onSuccess: () => setMessaggio({ kind: 'success', text: t('aziende.eliminata') }),
            onError: (err) =>
              setMessaggio({
                kind: 'error',
                text: translateApiError(t, err, t('aziende.erroreSalva')),
              }),
          });
        }}
        onOpenChange={(open) => {
          if (!open) setDaEliminare(null);
        }}
      />
    </div>
  );
}
