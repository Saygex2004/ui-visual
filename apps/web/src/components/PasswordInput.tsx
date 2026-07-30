// Hand-styled password input, replacing `primereact/inputpassword` (Execution
// Plan Phase 9). Deliberately simplifies PrimeReact's headless
// `onValueChange={(e: {value}) => …}` event shape to a plain
// `onChange(value: string)` callback — every call site is rewritten in this
// same phase anyway (no external constraint to preserve the old shape).
// Reproduces the current masked-by-default + show/hide toggle affordance.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './textInput.css';
import './passwordInput.css';

export interface PasswordInputProps {
  id?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PasswordInput({
  id,
  name,
  autoComplete,
  required,
  disabled,
  value,
  onChange,
  className,
}: PasswordInputProps) {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className ? `ui-password-input ${className}` : 'ui-password-input'}>
      <input
        id={inputId}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ui-text-input ui-password-input-field"
      />
      <button
        type="button"
        className="ui-password-input-toggle"
        aria-label={visible ? t('passwordToggle.hide') : t('passwordToggle.show')}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4.5 9 7 0 1-.55 2.27-1.5 3.5M6.35 6.35C4.06 7.9 2.5 10 2.5 12c0 2.5 4 7 9.5 7 1.27 0 2.44-.24 3.47-.66"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.5 12S6.5 5 12 5s9.5 7 9.5 7-4 7-9.5 7-9.5-7-9.5-7z"
            />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </button>
    </div>
  );
}
