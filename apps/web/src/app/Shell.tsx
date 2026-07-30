// App shell: the user-menu header (UI §2.5) — account name, Calendario /
// Le mie chat / Amministrazione (admins only) / tema / Esci, with the unread
// badge (UI §6.1: "on the user-menu button ... on every screen"). Exposes
// menu role/expanded state to assistive technology (UI §11).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, Moon, Sun } from 'lucide-react';
import type { UserPublic } from '@pvp/shared';
import { useLogout } from '../features/auth/hooks.js';
import { useUnreadTotal } from '../features/chat/hooks.js';
import { useTheme } from '../lib/theme.js';
import './shell.css';

export function Shell({ user, children }: { user: UserPublic; children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const unreadTotal = useUnreadTotal();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/login' });
      },
    });
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <span className="shell-brand">{t('app.name')}</span>
        <div className="shell-user-menu" ref={menuRef}>
          <button
            type="button"
            className="shell-user-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {unreadTotal > 0 ? (
              <span
                className="shell-unread-badge"
                aria-label={t('userMenu.unread', { count: unreadTotal })}
              >
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </span>
            ) : null}
            <span>{user.username}</span>
          </button>
          {menuOpen ? (
            <div className="shell-user-menu-panel" role="menu">
              <Link
                to="/calendario"
                role="menuitem"
                className="shell-user-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                {t('userMenu.calendar')}
              </Link>
              <Link
                to="/chat"
                role="menuitem"
                className="shell-user-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                {t('userMenu.myChats')}
                {unreadTotal > 0 ? ` (${unreadTotal > 9 ? '9+' : unreadTotal})` : ''}
              </Link>
              {user.role === 'admin' ? (
                <Link
                  to="/admin"
                  role="menuitem"
                  className="shell-user-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('userMenu.admin')}
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="shell-user-menu-item"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <Sun aria-hidden="true" size={16} />
                ) : (
                  <Moon aria-hidden="true" size={16} />
                )}
                {theme === 'dark'
                  ? t('userMenu.theme.switchToLight')
                  : t('userMenu.theme.switchToDark')}
              </button>
              <button
                type="button"
                role="menuitem"
                className="shell-user-menu-item"
                onClick={handleLogout}
              >
                <LogOut aria-hidden="true" size={16} />
                {t('userMenu.signOut')}
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="shell-content">{children}</main>
    </div>
  );
}
