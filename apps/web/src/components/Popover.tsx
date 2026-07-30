// Popover primitive over `@radix-ui/react-popover` (Execution Plan
// Phase 13). One floating-layer voice for every anchored panel in the app
// (cluster/region selectors, participant picker, blocco jump): the styled
// `PopoverContent` carries the `--shadow-pop` elevation and `pvp-pop`
// entrance from tokens.css, portals by default (so it escapes the table's
// overflow/frozen-column clipping), and closes on Esc/outside-click via
// Radix. Callers own trigger markup and ARIA semantics.
import * as RadixPopover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import './popover.css';

export const PopoverRoot = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;
export const PopoverClose = RadixPopover.Close;

export interface PopoverContentProps extends RadixPopover.PopoverContentProps {
  children: ReactNode;
}

export function PopoverContent({ className, children, ...rest }: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        className={className ? `ui-popover ${className}` : 'ui-popover'}
        sideOffset={6}
        collisionPadding={8}
        {...rest}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}
