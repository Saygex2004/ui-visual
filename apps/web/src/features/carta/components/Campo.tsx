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
