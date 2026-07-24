// Administration — Accounts (UI §8.1). The accounts table with lifecycle
// actions, the create form, and two onward links (calendar assignment,
// extraction categories) — disabled placeholders until Phases 5/8.
import { useTranslation } from 'react-i18next';
import type { AdminUser } from '@pvp/shared';
import { useAdminUsers } from './hooks.js';
import { CreateUserForm } from './CreateUserForm.js';
import { AccountRow } from './AccountRow.js';
import './admin.css';

export function AccountsScreen() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError } = useAdminUsers();

  const activeAdminCount = data?.users.filter((u) => u.role === 'admin' && !u.disabled).length ?? 0;
  // Client-side heuristic only, to disable the button proactively — the
  // server is the real last-admin guard (409 errors.admin.lastAdmin).
  const isLastActiveAdmin = (user: AdminUser) =>
    user.role === 'admin' && !user.disabled && activeAdminCount <= 1;

  return (
    <div className="admin-screen">
      <h1>{t('accounts.title')}</h1>

      <CreateUserForm />

      <section>
        <h2 className="admin-form-title">{t('accounts.listTitle')}</h2>
        {isLoading ? <p>{t('accounts.loading')}</p> : null}
        {isError ? (
          <p className="admin-message admin-message-error" role="alert">
            {t('accounts.loadError')}
          </p>
        ) : null}
        {data ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('accounts.columnUsername')}</th>
                  <th>{t('accounts.columnRole')}</th>
                  <th>{t('accounts.columnState')}</th>
                  <th>{t('accounts.columnCreatedAt')}</th>
                  <th>{t('accounts.columnActions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <AccountRow
                    key={user.id}
                    user={user}
                    isLastAdminGuess={isLastActiveAdmin(user)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <nav className="admin-onward-links">
        <span className="admin-onward-link admin-onward-link-disabled" aria-disabled="true">
          {t('accounts.linkCalendarAssignment')}
        </span>
        <span className="admin-onward-link admin-onward-link-disabled" aria-disabled="true">
          {t('accounts.linkCategories')}
        </span>
      </nav>
    </div>
  );
}
