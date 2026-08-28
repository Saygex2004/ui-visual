// The letterhead view: pick a company and a document type, fill the form,
// watch the page build itself on the right, download the Word file.
//
// Split from the standalone app's single 1,200-line component: state and
// layout here, each group of fields in its own section, validation in
// utils/validazione, generation in utils/docxGenerator.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '../../components/Button.js';
import { SelectField } from '../../components/SelectField.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { AZIENDE, TIPI_DOCUMENTO, TESTI_DEFAULT } from './data/aziende.js';
import { DocumentPreview } from './components/DocumentPreview.js';
import { CartaForm } from './components/CartaForm.js';
import { generateDocx } from './utils/docxGenerator.js';
import { missingTutto } from './utils/validazione.js';
import { datiIniziali } from './formState.js';
import type { CartaFormData, TipoLettera } from './types.js';
import './carta.css';

export function CartaScreen() {
  const { t } = useTranslation('carta');
  const [azId, setAzId] = useState(AZIENDE[0]!.id);
  const [tipo, setTipo] = useState<TipoLettera>('proposta');
  const [formData, setFormData] = useState<CartaFormData>(() => datiIniziali(AZIENDE[0]!));
  const [generando, setGenerando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const azienda = useMemo(() => AZIENDE.find((a) => a.id === azId) ?? AZIENDE[0]!, [azId]);
  const mancanti = useMemo(() => missingTutto(tipo, azienda, formData), [tipo, azienda, formData]);

  const set = <K extends keyof CartaFormData>(campo: K, valore: CartaFormData[K]) =>
    setFormData((f) => ({ ...f, [campo]: valore }));

  function cambiaTipo(nuovo: TipoLettera) {
    setTipo(nuovo);
    // Each document type brings its own default wording; switching type
    // replaces the boilerplate but leaves what the operator typed.
    const testi = TESTI_DEFAULT[nuovo];
    if (testi) {
      setFormData((f) => ({
        ...f,
        apertura: testi.apertura ?? f.apertura,
        testo: testi.corpo ?? f.testo,
        chiusura: testi.chiusura ?? f.chiusura,
      }));
    }
  }

  async function scarica() {
    setErrore(null);
    setGenerando(true);
    try {
      await generateDocx(azienda, { ...formData, tipo });
    } catch (e) {
      setErrore(e instanceof Error ? e.message : t('errors.generateFailed'));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="carta-screen">
      <header className="carta-header">
        <div>
          <h1 className="carta-title">{t('title')}</h1>
          <p className="carta-subtitle">{t('subtitle')}</p>
        </div>
        <Button onClick={() => void scarica()} disabled={generando}>
          <Download aria-hidden="true" size={15} />
          {generando ? t('actions.generating') : t('actions.download')}
        </Button>
      </header>

      {errore ? <StatusDisplay variant="error" message={errore} /> : null}

      <div className="carta-layout">
        <div className="carta-form">
          <SelectField
            label={t('fields.azienda')}
            id="carta-azienda"
            value={azId}
            onChange={(e) => setAzId(e.target.value)}
          >
            {AZIENDE.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome ?? a.id}
              </option>
            ))}
          </SelectField>

          <SelectField
            label={t('fields.tipo')}
            id="carta-tipo"
            value={tipo}
            onChange={(e) => cambiaTipo(e.target.value as TipoLettera)}
          >
            {TIPI_DOCUMENTO.map((td) => (
              <option key={td.id} value={td.id}>
                {td.label}
              </option>
            ))}
          </SelectField>

          <CartaForm azienda={azienda} tipo={tipo} formData={formData} set={set} />

          {mancanti.length > 0 ? (
            <StatusDisplay
              variant="info"
              message={t('states.missing', { campi: mancanti.join(', ') })}
            />
          ) : null}
        </div>

        <div className="carta-preview">
          <DocumentPreview
            azienda={azienda}
            formData={formData}
            tipo={tipo}
            scale={0.72}
            onBodyChange={(html) => set('testo', html)}
          />
        </div>
      </div>
    </div>
  );
}
