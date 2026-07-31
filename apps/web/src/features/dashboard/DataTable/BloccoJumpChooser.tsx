// Cross-cluster blocco jump control (UI §4.4). Exactly one other cluster
// jumps directly on click; more than one opens a small dismissible chooser
// listing them by name. Phase 11 hardening: this is the same "pick one of
// several actions" pattern as the row's overflow menu, so it now shares the
// DropdownMenu primitive (`components/DropdownMenu.js`, Radix
// DropdownMenu — arrow-key navigation, typeahead, Esc/outside dismissal,
// the shared `:focus-visible` ring) instead of a Popover wrapping a
// hand-rolled `role="menu"` list, which had none of that keyboard support.
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../../../components/DropdownMenu.js';

export interface BloccoJumpChooserProps {
  bloccoKey: string;
  otherClusterKeys: readonly string[];
  onJump: (targetClusterKey: string, bloccoKey: string) => void;
}

export function BloccoJumpChooser({ bloccoKey, otherClusterKeys, onJump }: BloccoJumpChooserProps) {
  const { t } = useTranslation('dashboard');

  if (otherClusterKeys.length === 1) {
    const target = otherClusterKeys[0]!;
    const label = t('table.bloccoJumpTitle', { name: t(`cluster.name.${target}`) });
    return (
      <button
        type="button"
        className="blocco-jump-control"
        title={label}
        aria-label={label}
        onClick={() => onJump(target, bloccoKey)}
      >
        <ArrowRight aria-hidden="true" size={14} />
      </button>
    );
  }

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <button
          type="button"
          className="blocco-jump-control"
          title={t('table.bloccoJumpChooserTitle')}
          aria-label={t('table.bloccoJumpChooserTitle')}
        >
          <ArrowRight aria-hidden="true" size={14} />
        </button>
      </MenuTrigger>
      <MenuContent align="start">
        {otherClusterKeys.map((key) => (
          <MenuItem key={key} onSelect={() => onJump(key, bloccoKey)}>
            {t(`cluster.name.${key}`)}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}
