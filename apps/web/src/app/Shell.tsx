// App shell (UI §2.5, redesigned in Execution Plan Phase 13): sticky app
// bar with the clickable placeholder logo (always → "/", the "Scegli una
// vista" homepage), a route-aware breadcrumb, and the user pill — avatar +
// username — opening the shared DropdownMenu (Calendario / Le mie chat /
// Amministrazione (admins only) / tema / Esci), with the unread badge
// (UI §6.1: "on the user-menu button ... on every screen"). The trigger's
// accessible name stays the username (e2e contract).
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { CalendarDays, LogOut, MessageSquare, Moon, Sun, Wrench } from 'lucide-react';
import type { UserPublic } from '@pvp/shared';
import { useLogout } from '../features/auth/hooks.js';
import { useUnreadTotal } from '../features/chat/hooks.js';
import { useTheme } from '../lib/theme.js';
import { Avatar } from '../components/Avatar.js';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '../components/DropdownMenu.js';
import './shell.css';

function useBreadcrumbKey(): string | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith('/aste/immobili')) return 'dashboard:area.title.immobili';
  if (pathname.startsWith('/aste/crediti')) return 'dashboard:area.title.crediti';
  if (pathname.startsWith('/calendario')) return 'userMenu.calendar';
  if (pathname.startsWith('/chat')) return 'userMenu.myChats';
  if (pathname.startsWith('/admin')) return 'userMenu.admin';
  return null;
}

export function BrandLogo() {
  const { t } = useTranslation('common');
  return (
    <span className="shell-logo">
      <span className="shell-logo-tile" aria-hidden="true">
        <span className="shell-logo-bar shell-logo-bar-1" />
        <span className="shell-logo-bar shell-logo-bar-2" />
        <span className="shell-logo-bar shell-logo-bar-3" />
      </span>
      <span className="shell-logo-wordmark">
        <span className="shell-logo-name">{t('app.brandName')}</span>
        <span className="shell-logo-sub">{t('app.brandSub')}</span>
      </span>
    </span>
  );
}

export function Shell({ user, children }: { user: UserPublic; children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const logout = useLogout();
  const unreadTotal = useUnreadTotal();
  const { theme, toggleTheme } = useTheme();
  const breadcrumbKey = useBreadcrumbKey();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/login' });
      },
    });
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <Link to="/" className="shell-logo-link" title={t('app.homeLinkTitle')}>
          <BrandLogo />
        </Link>
        {breadcrumbKey ? (
          <span className="shell-breadcrumb">
            <span className="shell-breadcrumb-sep" aria-hidden="true">
              {'/'}
            </span>
            <span className="shell-breadcrumb-label">{t(breadcrumbKey)}</span>
          </span>
        ) : null}
        <div className="shell-header-spacer" />
        <MenuRoot>
          <MenuTrigger className="shell-user-menu-trigger">
            {unreadTotal > 0 ? (
              <span
                className="shell-unread-badge"
                aria-label={t('userMenu.unread', { count: unreadTotal })}
              >
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </span>
            ) : null}
            <Avatar name={user.username} size="md" />
            <span className="shell-user-name">{user.username}</span>
          </MenuTrigger>
          <MenuContent align="end">
            <div className="shell-user-menu-header">
              <span className="shell-user-menu-username">{user.username}</span>
              <span className="shell-user-menu-role">{t(`userMenu.role.${user.role}`)}</span>
            </div>
            <MenuItem asChild>
              <Link to="/calendario">
                <CalendarDays aria-hidden="true" size={16} />
                {t('userMenu.calendar')}
              </Link>
            </MenuItem>
            <MenuItem asChild>
              <Link to="/chat">
                <MessageSquare aria-hidden="true" size={16} />
                {t('userMenu.myChats')}
                {unreadTotal > 0 ? (
                  <span className="shell-unread-badge shell-unread-badge-menu">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                  </span>
                ) : null}
              </Link>
            </MenuItem>
            {user.role === 'admin' ? (
              <MenuItem asChild>
                <Link to="/admin">
                  <Wrench aria-hidden="true" size={16} />
                  {t('userMenu.admin')}
                </Link>
              </MenuItem>
            ) : null}
            <MenuSeparator />
            <MenuItem
              onSelect={(event) => {
                event.preventDefault();
                toggleTheme();
              }}
            >
              {theme === 'dark' ? (
                <Sun aria-hidden="true" size={16} />
              ) : (
                <Moon aria-hidden="true" size={16} />
              )}
              {theme === 'dark'
                ? t('userMenu.theme.switchToLight')
                : t('userMenu.theme.switchToDark')}
            </MenuItem>
            <MenuItem onSelect={handleLogout}>
              <LogOut aria-hidden="true" size={16} />
              {t('userMenu.signOut')}
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </header>
      <main className="shell-content">{children}</main>
    </div>
  );
}
