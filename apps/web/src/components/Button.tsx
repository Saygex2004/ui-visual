// Hand-styled button primitive, replacing `primereact/button` (Execution
// Plan Phase 9). Phase 13 adds the reference's CTA voices (design.md):
// `brand` (navy fill, at most one per screen), `tinted` (accent-soft fill),
// `ghost` (transparent pill), and the square `icon` size for "⋯"/"×"
// controls.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './button.css';

export type ButtonSeverity =
  'primary' | 'secondary' | 'success' | 'danger' | 'brand' | 'tinted' | 'ghost';
export type ButtonSize = 'small' | 'default' | 'icon';

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
  const classes = [
    'ui-button',
    `ui-button-${severity}`,
    size === 'small' ? 'ui-button-small' : '',
    size === 'icon' ? 'ui-button-icon' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={className ? `${classes} ${className}` : classes} {...rest} />
  );
}
