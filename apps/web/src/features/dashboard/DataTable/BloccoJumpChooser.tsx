// Cross-cluster blocco jump control (UI §4.4). Exactly one other cluster
// jumps directly on click; more than one opens a small dismissible chooser
// listing them by name — plain HTML + outside-click, same precedent as the
// rest of this phase (PrimeReact's compound Popover/Menu API isn't worth it
// for a 2-4-item dismissible list; Tabs is the one deliberate exception, see
// HANDOFF_PHASE_4.md).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface BloccoJumpChooserProps {
  bloccoKey: string;
  otherClusterKeys: readonly string[];
  onJump: (targetClusterKey: string, bloccoKey: string) => void;
}

export function BloccoJumpChooser({ bloccoKey, otherClusterKeys, onJump }: BloccoJumpChooserProps) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

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
        <span aria-hidden="true">{'→'}</span>
      </button>
    );
  }

  return (
    <div className="blocco-jump-chooser" ref={rootRef}>
      <button
        type="button"
        className="blocco-jump-control"
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('table.bloccoJumpChooserTitle')}
        aria-label={t('table.bloccoJumpChooserTitle')}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{'→'}</span>
      </button>
      {open ? (
        <ul className="blocco-jump-menu" role="menu">
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
      ) : null}
    </div>
  );
}
