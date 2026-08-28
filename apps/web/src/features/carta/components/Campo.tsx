// A labelled input bound to one form field. Exists so the nine sections below
// read as a list of fields rather than as a wall of repeated markup.
import type { ReactNode } from 'react';
import { Field } from '../../../components/Field.js';
import { TextInput } from '../../../components/TextInput.js';
import { SelectField } from '../../../components/SelectField.js';

export interface CampoProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'date' | 'number';
  placeholder?: string;
  /** Shown under the input — used for the amount written out in words. */
  hint?: string;
}

export function Campo({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: CampoProps) {
  return (
    <Field label={label} htmlFor={id}>
      <TextInput
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className="carta-hint">{hint}</span> : null}
    </Field>
  );
}

export interface ScelteProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}

export function Scelte({ id, label, value, onChange, children }: ScelteProps) {
  return (
    <SelectField label={label} id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </SelectField>
  );
}

export interface ImportoLettereProps {
  id: string;
  label: string;
  value: string;
  manuale: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  autoLabel: string;
  manualeLabel: string;
}

/** The amount written out, shown as its own field rather than as a hint under
 *  the figure: it is text that will appear in the letter, so it has to be
 *  visible before it is signed — and correctable, because spelling out an
 *  amount is a judgement the machine can get wrong on an unusual figure. */
export function ImportoLettere({
  id,
  label,
  value,
  manuale,
  onToggle,
  onChange,
  autoLabel,
  manualeLabel,
}: ImportoLettereProps) {
  return (
    <div className="carta-lettere">
      <div className="carta-lettere-head">
        <label className="ui-micro-label" htmlFor={id}>
          {label}
        </label>
        <button
          type="button"
          className="carta-lettere-toggle"
          onClick={onToggle}
          aria-pressed={manuale}
        >
          {manuale ? autoLabel : manualeLabel}
        </button>
      </div>
      <TextInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!manuale}
        aria-readonly={!manuale}
      />
    </div>
  );
}
