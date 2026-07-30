// DropdownMenu primitive over `@radix-ui/react-dropdown-menu` (Execution
// Plan Phase 13). One menu voice for the shell user menu and the table
// row's overflow ("⋯") actions: Radix provides role="menu"/"menuitem",
// typeahead, arrow-key navigation and Esc/outside dismissal; the styled
// content shares the popover elevation (`--shadow-pop`, `pvp-pop`). Items
// are composed by callers (icon + label; `asChild` for router links).
import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import './dropdownMenu.css';

export const MenuRoot = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;
export const MenuSeparator = (props: RadixMenu.DropdownMenuSeparatorProps) => (
  <RadixMenu.Separator
    {...props}
    className={props.className ? `ui-menu-separator ${props.className}` : 'ui-menu-separator'}
  />
);

export function MenuLabel({ className, ...rest }: RadixMenu.DropdownMenuLabelProps) {
  return (
    <RadixMenu.Label
      className={className ? `ui-menu-label ${className}` : 'ui-menu-label'}
      {...rest}
    />
  );
}

export function MenuItem({ className, ...rest }: RadixMenu.DropdownMenuItemProps) {
  return (
    <RadixMenu.Item
      className={className ? `ui-menu-item ${className}` : 'ui-menu-item'}
      {...rest}
    />
  );
}

export interface MenuContentProps extends RadixMenu.DropdownMenuContentProps {
  children: ReactNode;
}

export function MenuContent({ className, children, ...rest }: MenuContentProps) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        className={className ? `ui-menu ${className}` : 'ui-menu'}
        sideOffset={6}
        collisionPadding={8}
        {...rest}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}
