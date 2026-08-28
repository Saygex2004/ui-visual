// Administration — whether each view is open at all.
//
// Deliberately next to the per-account grants, because the two are easy to
// confuse and the difference matters: a grant says who MAY open a view, this
// says whether the view is open to anyone. Closing one for work therefore
// touches nobody's permissions, and reopening it restores them exactly as
// they were — which is the reason it is a separate switch and not a mass
// edit of everyone's list.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STATI_VISTA, VISTE, type StatoVista, type Vista } from '@pvp/shared';
import { SelectField } from '../../components/SelectField.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { translateApiError } from '../../lib/translateApiError.js';
import { useSetVisteStati, useVisteStati } from './hooks.js';

export function StatiVisteBox() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError, error } = useVisteStati();
  const salva = useSetVisteStati();
  const [errore, setErrore] = useState<string | null>(null);

  const stati = data?.stati ?? {};

  function cambia(vista: Vista, stato: StatoVista) {
    setErrore(null);
    // The whole map is sent, not one entry: the document IS the answer for
    // every view, and a partial write would leave the others to be inferred.
    salva.mutate(
      { stati: { ...stati, [vista]: stato } },
      { onError: (err) => setErrore(translateApiError(t, err, t('statiViste.saveError'))) },
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
