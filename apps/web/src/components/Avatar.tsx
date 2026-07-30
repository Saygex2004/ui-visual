// Initials avatar + overlapping stack (Execution Plan Phase 13): the shell
// user pill, chat participant stacks, mention/participant pickers. Fill
// colour is hashed from `seed` (username) over the categorical ramp so a
// given colleague keeps one colour everywhere without any stored mapping.
import type { ReactNode } from 'react';
import './avatar.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

const CAT_COUNT = 7;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % CAT_COUNT) + 1;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first || !last) return '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export interface AvatarProps {
  name: string;
  /** Colour-hash seed; defaults to `name`. */
  seed?: string;
  size?: AvatarSize;
  title?: string;
  className?: string;
}

export function Avatar({ name, seed, size = 'md', title, className }: AvatarProps) {
  const cat = hashSeed(seed ?? name);
  const classes = ['ui-avatar', `ui-avatar-${size}`, `ui-avatar-cat-${cat}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} title={title} aria-hidden={title ? undefined : true}>
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={className ? `ui-avatar-stack ${className}` : 'ui-avatar-stack'}>
      {children}
    </span>
  );
}
