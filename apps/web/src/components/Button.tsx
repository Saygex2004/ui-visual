// Hand-styled button primitive, replacing `primereact/button` (Execution
// Plan Phase 9). Covers exactly the prop surface every call site used:
// type, disabled, severity, size, onClick, children — no icon/loading/
// rounded/raised/outlined variants existed in the app, so none are built.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './button.css';

export type ButtonSeverity = 'primary' | 'secondary' | 'success' | 'danger';
export type ButtonSize = 'small' | 'default';

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className'
> {
  severity?: ButtonSeverity;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function Button({
  severity = 'primary',
  size = 'default',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['ui-button', `ui-button-${severity}`, size === 'small' ? 'ui-button-small' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={className ? `${classes} ${className}` : classes} {...rest} />
  );
}
