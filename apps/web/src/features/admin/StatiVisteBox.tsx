// Administration — whether each view is open at all.
//
// Deliberately next to the per-account grants, because the two are easy to
// confuse and the difference matters: a grant says who MAY open a view, this
// says whether the view is open to anyone. Closing one for work therefore
// touches nobody's permissions, and reopening it restores them exactly as
// they were — which is the reason it is a separate switch and not a mass
// edit of everyone's list.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STATI_VISTA, VISTE, type StatiViste, type StatoVista, type Vista } from '@pvp/shared';
import { SelectField } from '../../components/SelectField.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { translateApiError } from '../../lib/translateApiError.js';
import { useSetVisteStati, useVisteStati } from './hooks.js';

export function StatiVisteBox() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError, error } = useVisteStati();
  const salva = useSetVisteStati();
  const [errore, setErrore] = useState<string | null>(null);

  // What the admin has set, ahead of the server confirming it. Without this,
  // changing two switches in quick succession lost the first: each change
  // sends the WHOLE map, and the second one built its map from a query that
  // had not refetched yet — so it wrote the second view's state over a
  // document that no longer mentioned the first.
  const [inCorso, setInCorso] = useState<StatiViste | null>(null);
  // Which change is the latest, so a slower earlier response cannot clear a
  // newer local value and reopen the same hole from the other side.
  const ultima = useRef(0);

  const stati = inCorso ?? data?.stati ?? {};

  function cambia(vista: Vista, stato: StatoVista) {
    setErrore(null);
    // The whole map is sent, not one entry: the document IS the answer for
    // every view, and a partial write would leave the others to be inferred.
    const prossimo = { ...stati, [vista]: stato };
    setInCorso(prossimo);
    const mio = ++ultima.current;
    salva.mutate(
      { stati: prossimo },
      {
        onSuccess: () => {
          // Hand display back to the server's answer, which the hook has just
          // written into the cache — so another admin's concurrent change is
          // not masked by a local copy that outlives its purpose.
          if (ultima.current === mio) setInCorso(null);
        },
        onError: (err) => {
          if (ultima.current === mio) setInCorso(null);
          setErrore(translateApiError(t, err, t('statiViste.saveError')));
        },
      },
    );
  }

  if (isLoading) return <StatusDisplay variant="loading" message={t('statiViste.loading')} />;
  if (isError)
    return (
      <StatusDisplay
        variant="error"
        message={translateApiError(t, error, t('statiViste.loadError'))}
      />
    );

  return (
    <section className="admin-stati-viste">
      <h2 className="admin-form-title">{t('statiViste.title')}</h2>
      <p className="admin-intro">{t('statiViste.intro')}</p>
      <div className="admin-stati-viste-grid">
        {VISTE.map((v) => (
          <SelectField
            key={v}
            label={t(`viste.nomi.${v}`)}
            id={`stato-vista-${v}`}
            value={stati[v] ?? 'attivo'}
            disabled={salva.isPending}
            onChange={(e) => cambia(v, e.target.value as StatoVista)}
          >
            {STATI_VISTA.map((s) => (
              <option key={s} value={s}>
                {t(`statiViste.stati.${s}`)}
              </option>
            ))}
          </SelectField>
        ))}
      </div>
      {/* Said once, here, rather than left to be discovered: an administrator
          who closes a view and still sees it would otherwise assume the
          switch did not work. */}
      <p className="admin-intro">{t('statiViste.notaAdmin')}</p>
      {errore ? <StatusDisplay variant="error" message={errore} /> : null}
    </section>
  );
}
