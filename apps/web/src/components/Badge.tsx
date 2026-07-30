// Pill badge primitive (Execution Plan Phase 13): status pills ("Attiva"),
// tab/menu count pills, table blocco badges. Text uses the `-strong` status
// tokens on the soft tints (the base status colours sit under AA for badge-
// size text — see design.md Notes).
import type { HTMLAttributes } from 'react';
import './badge.css';

export type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ variant = 'neutral', className, ...rest }: BadgeProps) {
  const classes = ['ui-badge', `ui-badge-${variant}`, className].filter(Boolean).join(' ');
  return <span className={classes} {...rest} />;
}
