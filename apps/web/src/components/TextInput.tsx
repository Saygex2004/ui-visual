// Hand-styled input primitive, replacing `primereact/inputtext` (Execution
// Plan Phase 9). A thin pass-through over the native <input> — every call
// site already uses plain DOM props (id, name, type, value, onChange,
// placeholder, autoComplete, required, min, max), so no headless event
// shape is needed here, unlike PasswordInput.
import type { InputHTMLAttributes } from 'react';
import './textInput.css';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
}

export function TextInput({ className, ...rest }: TextInputProps) {
  return <input className={className ? `ui-text-input ${className}` : 'ui-text-input'} {...rest} />;
}
