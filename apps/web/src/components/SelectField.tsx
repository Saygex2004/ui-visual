// Labeled native <select> (Execution Plan Phase 13). Filters deliberately
// stay native selects — mobile pickers for free, and the e2e suite's
// `getByLabel(...).selectOption(...)` affordance — restyled to the field
// voice with a Lucide chevron over the hidden platform arrow.
import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { Field } from './Field';
import './selectField.css';

export interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'children'
> {
  label: string;
  fieldClassName?: string;
  children: ReactNode;
}

export function SelectField({ label, fieldClassName, id, children, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field label={label} htmlFor={selectId} className={fieldClassName}>
      <span className="ui-select-wrap">
        <select id={selectId} className="ui-select" {...rest}>
          {children}
        </select>
        <ChevronDown aria-hidden="true" size={14} className="ui-select-chevron" />
      </span>
    </Field>
  );
}
