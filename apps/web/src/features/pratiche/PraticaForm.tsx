// The pratica form — one component for both "new" and "edit", because the
// fields, their validation and their labels are identical in the two cases
// and keeping two copies is how they drift apart.
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Pratica, PraticaInput } from '@pvp/shared';
import { TextInput } from '../../components/TextInput.js';
import { SelectField } from '../../components/SelectField.js';
import { Field } from '../../components/Field.js';
import { Button } from '../../components/Button.js';

export interface PraticaFormProps {
  /** Absent for a new pratica; the record being edited otherwise. */
  initial?: Pratica;
  utenti: { id: string; username: string }[];
  /** Vehicles already present, offered as a datalist — free text stays
   *  possible so a brand-new vehicle never blocks data entry. */
  veicoliNoti: string[];
  submitting: boolean;
  onSubmit: (input: PraticaInput) => void;
  onCancel: () => void;
}

export function PraticaForm({
  initial,
  utenti,
  veicoliNoti,
  submitting,
  onSubmit,
  onCancel,
}: PraticaFormProps) {
  const { t } = useTranslation('pratiche');
  const [ndg, setNdg] = useState(initial?.ndg ?? '');
  const [numeroPratica, setNumeroPratica] = useState(initial?.numero_pratica ?? '');
  const [veicolo, setVeicolo] = useState(initial?.veicolo ?? '');
  const [estinto, setEstinto] = useState(initial?.estinto ?? false);
  const [scatola, setScatola] = useState(
    initial?.n_scatola == null ? '' : String(initial.n_scatola),
  );
  const [plurima, setPlurima] = useState(initial?.plurima_riscontro ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [ordinatoDa, setOrdinatoDa] = useState(initial?.ordinato_da ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number.parseInt(scatola, 10);
    onSubmit({
      ndg: ndg.trim(),
      numero_pratica: numeroPratica.trim(),
      veicolo: veicolo.trim() || null,
      estinto,
      // A blank or unparseable box is "not filed", not box 0 — the schema
      // rejects 0 and the difference matters when locating a file.
      n_scatola: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      plurima_riscontro: plurima.trim() || null,
      note: note.trim() || null,
      ordinato_da: ordinatoDa || null,
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
        <Field label={t('fields.veicolo')} htmlFor="pratica-veicolo">
          <TextInput
            id="pratica-veicolo"
            list="pratica-veicoli"
            value={veicolo}
            onChange={(e) => setVeicolo(e.target.value)}
          />
          <datalist id="pratica-veicoli">
            {veicoliNoti.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label={t('fields.scatola')} htmlFor="pratica-scatola">
          <TextInput
            id="pratica-scatola"
            type="number"
            min={1}
            step={1}
            value={scatola}
            onChange={(e) => setScatola(e.target.value)}
          />
        </Field>
        <Field label={t('fields.plurima')} htmlFor="pratica-plurima">
          <TextInput
            id="pratica-plurima"
            value={plurima}
            onChange={(e) => setPlurima(e.target.value)}
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
        <SelectField
          label={t('fields.estinto')}
          id="pratica-estinto"
          value={estinto ? 'si' : 'no'}
          onChange={(e) => setEstinto(e.target.value === 'si')}
        >
          <option value="no">{t('common.no')}</option>
          <option value="si">{t('common.si')}</option>
        </SelectField>
      </div>
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
