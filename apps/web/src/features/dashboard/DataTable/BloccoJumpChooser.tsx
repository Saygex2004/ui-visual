// Cross-cluster blocco jump control (UI §4.4). Exactly one other cluster
// jumps directly on click; more than one opens a small dismissible chooser
// listing them by name. Phase 13 moves the chooser onto the shared Popover
// primitive (portalled — so the virtualized table's overflow container can
// never clip it) while keeping the same menu/menuitem semantics the e2e
// suite asserts.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../../../components/Popover.js';

export interface BloccoJumpChooserProps {
  bloccoKey: string;
  otherClusterKeys: readonly string[];
  onJump: (targetClusterKey: string, bloccoKey: string) => void;
}

export function BloccoJumpChooser({ bloccoKey, otherClusterKeys, onJump }: BloccoJumpChooserProps) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);

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
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="blocco-jump-control"
        aria-haspopup="menu"
        title={t('table.bloccoJumpChooserTitle')}
        aria-label={t('table.bloccoJumpChooserTitle')}
      >
        <ArrowRight aria-hidden="true" size={14} />
      </PopoverTrigger>
      <PopoverContent align="start" className="blocco-jump-menu">
        <ul role="menu" className="blocco-jump-menu-list">
          {otherClusterKeys.map((key) => (
            <li key={key} role="none">
              <button
                type="button"
                role="menuitem"
                className="blocco-jump-menu-item"
                onClick={() => {
                  setOpen(false);
                  onJump(key, bloccoKey);
                }}
              >
                {t(`cluster.name.${key}`)}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </PopoverRoot>
  );
}
