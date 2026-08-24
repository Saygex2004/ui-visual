// The pratica form — one component for both "new" and "edit", because the
// fields, their validation and their labels are identical in the two cases
// and keeping two copies is how they drift apart.
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { STATI_PRATICA, type Pratica, type PraticaInput, type StatoPratica } from '@pvp/shared';
import { TextInput } from '../../components/TextInput.js';
import { SelectField } from '../../components/SelectField.js';
import { Field } from '../../components/Field.js';
import { Button } from '../../components/Button.js';
import { formatEuro, parseEuro } from './praticheData.js';

export interface PraticaFormProps {
  /** Absent for a new pratica; the record being edited otherwise. */
  initial?: Pratica;
  utenti: { id: string; username: string }[];
  /** Portfolios already present, offered as a datalist — free text stays
   *  possible so a brand-new portfolio never blocks data entry. */
  portafogliNoti: string[];
  submitting: boolean;
  onSubmit: (input: PraticaInput) => void;
  onCancel: () => void;
}

export function PraticaForm({
  initial,
  utenti,
  portafogliNoti,
  submitting,
  onSubmit,
  onCancel,
}: PraticaFormProps) {
  const { t } = useTranslation('pratiche');
  const [ndg, setNdg] = useState(initial?.ndg ?? '');
  const [numeroPratica, setNumeroPratica] = useState(initial?.numero_pratica ?? '');
  const [portafoglio, setPortafoglio] = useState(initial?.portafoglio ?? '');
  const [stato, setStato] = useState<StatoPratica>(initial?.stato ?? 'richiesto');
  const [scatole, setScatole] = useState(initial?.n_scatole ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [ordinatoDa, setOrdinatoDa] = useState(initial?.ordinato_da ?? '');
  const [dataRichiesta, setDataRichiesta] = useState(initial?.data_richiesta ?? '');
  const [dataSpedizione, setDataSpedizione] = useState(initial?.data_spedizione ?? '');
  const [consegnaPrevista, setConsegnaPrevista] = useState(initial?.data_consegna_prevista ?? '');
  const [consegnaEffettiva, setConsegnaEffettiva] = useState(
    initial?.data_consegna_effettiva ?? '',
  );
  const [costo, setCosto] = useState(
    initial?.costo_spedizione_cent == null ? '' : formatEuro(initial.costo_spedizione_cent),
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      ndg: ndg.trim(),
      numero_pratica: numeroPratica.trim(),
      portafoglio: portafoglio.trim() || null,
      stato,
      n_scatole: scatole.trim() || null,
      note: note.trim() || null,
      ordinato_da: ordinatoDa || null,
      data_richiesta: dataRichiesta || null,
      data_spedizione: dataSpedizione || null,
      data_consegna_prevista: consegnaPrevista || null,
      data_consegna_effettiva: consegnaEffettiva || null,
      // Euros in the field, cents in the record — the conversion lives here
      // and in the display, never in between (schemas/partB/pratiche.ts).
      costo_spedizione_cent: parseEuro(costo),
    });
  }

  return (
    <form className="pratiche-form" onSubmit={handleSubmit}>
      <div className="pratiche-form-grid">
        <Field label={t('fields.ndg')} htmlFor="pratica-ndg">
          <TextInput
            id="pratica-ndg"
            required
            autoFocus
            value={ndg}
            onChange={(e) => setNdg(e.target.value)}
          />
        </Field>
        <Field label={t('fields.numeroPratica')} htmlFor="pratica-numero">
          <TextInput
            id="pratica-numero"
            required
            value={numeroPratica}
            onChange={(e) => setNumeroPratica(e.target.value)}
          />
        </Field>
        <Field label={t('fields.portafoglio')} htmlFor="pratica-portafoglio">
          <TextInput
            id="pratica-portafoglio"
            list="pratica-portafogli"
            value={portafoglio}
            onChange={(e) => setPortafoglio(e.target.value)}
          />
          <datalist id="pratica-portafogli">
            {portafogliNoti.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <SelectField
          label={t('fields.stato')}
          id="pratica-stato"
          value={stato}
          onChange={(e) => setStato(e.target.value as StatoPratica)}
        >
          {STATI_PRATICA.map((s) => (
            <option key={s} value={s}>
              {t(`stati.${s}`)}
            </option>
          ))}
        </SelectField>
        <Field label={t('fields.scatole')} htmlFor="pratica-scatole">
          <TextInput
            id="pratica-scatole"
            value={scatole}
            onChange={(e) => setScatole(e.target.value)}
          />
        </Field>
        <SelectField
          label={t('fields.ordinatoDa')}
          id="pratica-ordinato"
          value={ordinatoDa}
          onChange={(e) => setOrdinatoDa(e.target.value)}
        >
          <option value="">{t('fields.ordinatoDaNessuno')}</option>
          {utenti.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </SelectField>
      </div>

      <fieldset className="pratiche-fieldset">
        <legend>{t('window.sezioneLogistica')}</legend>
        <div className="pratiche-form-grid">
          <Field label={t('fields.dataRichiesta')} htmlFor="pratica-data-richiesta">
            <TextInput
              id="pratica-data-richiesta"
              type="date"
              value={dataRichiesta}
              onChange={(e) => setDataRichiesta(e.target.value)}
            />
          </Field>
          <Field label={t('fields.dataSpedizione')} htmlFor="pratica-data-spedizione">
            <TextInput
              id="pratica-data-spedizione"
              type="date"
              value={dataSpedizione}
              onChange={(e) => setDataSpedizione(e.target.value)}
            />
          </Field>
          <Field label={t('fields.consegnaPrevista')} htmlFor="pratica-consegna-prevista">
            <TextInput
              id="pratica-consegna-prevista"
              type="date"
              value={consegnaPrevista}
              onChange={(e) => setConsegnaPrevista(e.target.value)}
            />
          </Field>
          <Field label={t('fields.consegnaEffettiva')} htmlFor="pratica-consegna-effettiva">
            <TextInput
              id="pratica-consegna-effettiva"
              type="date"
              value={consegnaEffettiva}
              onChange={(e) => setConsegnaEffettiva(e.target.value)}
            />
          </Field>
          <Field label={t('fields.costoSpedizione')} htmlFor="pratica-costo">
            <TextInput
              id="pratica-costo"
              inputMode="decimal"
              placeholder={t('fields.costoSpedizioneAiuto')}
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              // Normalized on blur, not on every keystroke: reformatting mid-typing
              // fights the cursor and makes the field feel possessed.
              onBlur={() => {
                const cent = parseEuro(costo);
                setCosto(cent == null ? '' : formatEuro(cent));
              }}
            />
          </Field>
        </div>
      </fieldset>

      <Field label={t('fields.note')} htmlFor="pratica-note" className="pratiche-form-full">
        <textarea
          id="pratica-note"
          className="pratiche-textarea"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="pratiche-form-actions">
        <Button type="button" severity="secondary" onClick={onCancel} disabled={submitting}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t('form.saving') : initial ? t('form.save') : t('form.create')}
        </Button>
      </div>
    </form>
  );
}
