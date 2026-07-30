// The micro-label field pattern (Execution Plan Phase 13, design.md
// "Micro-label voice"): an uppercase tracked label above any control —
// filter fields, selector-toolbar entries, form rows. One implementation so
// the voice can't drift per feature.
import type { ReactNode } from 'react';
import './field.css';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, className, children }: FieldProps) {
  return (
    <div className={className ? `ui-field ${className}` : 'ui-field'}>
      <label className="ui-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
