// One row of the accounts table (UI §8.1): lifecycle actions with
// confirmation and outcome messages. Uses window.confirm for the confirmation
// step (see Phase 3 handoff — PrimeReact 11's Dialog is a compound/headless
// component; a native confirm keeps this phase's scope proportionate).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InputPassword } from 'primereact/inputpassword';
import { Button } from 'primereact/button';
import type { AdminUser } from '@pvp/shared';
import { useSetPassword, useSetRole, useSetDisabled } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';

export function AccountRow({
  user,
  isLastAdminGuess,
}: {
  user: AdminUser;
  isLastAdminGuess: boolean;
}) {
  const { t } = useTranslation('admin');
  const setPassword = useSetPassword();
  const setRole = useSetRole();
  const setDisabled = useSetDisabled();

  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  function report(err: unknown, fallbackKey: string) {
    setMessage({ kind: 'error', text: translateApiError(t, err, t(fallbackKey)) });
  }

  function handleRoleToggle() {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmed = window.confirm(
      nextRole === 'admin'
        ? t('accounts.confirmPromote', { username: user.username })
        : t('accounts.confirmDemote', { username: user.username }),
    );
    if (!confirmed) return;
    setMessage(null);
    setRole.mutate(
      { userId: user.id, role: nextRole },
      {
        onSuccess: () => setMessage({ kind: 'success', text: t('accounts.roleChanged') }),
        onError: (err) => report(err, 'accounts.roleChangeGenericError'),
      },
    );
  }

  function handleDisabledToggle() {
    const nextDisabled = !user.disabled;
    const confirmed = window.confirm(
      nextDisabled
        ? t('accounts.confirmDisable', { username: user.username })
        : t('accounts.confirmEnable', { username: user.username }),
    );
    if (!confirmed) return;
    setMessage(null);
    setDisabled.mutate(
      { userId: user.id, disabled: nextDisabled },
      {
        onSuccess: () =>
          setMessage({
            kind: 'success',
            text: nextDisabled ? t('accounts.disabled') : t('accounts.enabled'),
          }),
        onError: (err) => report(err, 'accounts.disableGenericError'),
      },
    );
  }

  function handlePasswordSubmit() {
    if (newPassword.length === 0 || newPassword !== confirmPassword) {
      setMessage({ kind: 'error', text: t('accounts.passwordMismatch') });
      return;
    }
    setMessage(null);
    setPassword.mutate(
      { userId: user.id, newPassword },
      {
        onSuccess: () => {
          setMessage({ kind: 'success', text: t('accounts.passwordChanged') });
          setPasswordPanelOpen(false);
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => report(err, 'accounts.passwordChangeGenericError'),
      },
    );
  }

  return (
    <>
      <tr>
        <td>{user.username}</td>
        <td>{user.role === 'admin' ? t('accounts.roleAdmin') : t('accounts.roleUser')}</td>
        <td>{user.disabled ? t('accounts.stateDisabled') : t('accounts.stateActive')}</td>
        <td>{new Date(user.created_at).toLocaleDateString('it-IT')}</td>
        <td className="admin-row-actions">
          <Button size="small" severity="secondary" onClick={() => setPasswordPanelOpen((v) => !v)}>
            {t('accounts.actionChangePassword')}
          </Button>
          <Button
            size="small"
            severity="secondary"
            onClick={handleRoleToggle}
            disabled={isLastAdminGuess}
          >
            {user.role === 'admin' ? t('accounts.actionDemote') : t('accounts.actionPromote')}
          </Button>
          <Button
            size="small"
            severity={user.disabled ? 'success' : 'danger'}
            onClick={handleDisabledToggle}
            disabled={isLastAdminGuess}
          >
            {user.disabled ? t('accounts.actionEnable') : t('accounts.actionDisable')}
          </Button>
        </td>
      </tr>
      {passwordPanelOpen ? (
        <tr>
          <td colSpan={5}>
            <div className="admin-inline-panel">
              <div className="admin-field">
                <label htmlFor={`new-password-${user.id}`}>{t('accounts.newPasswordLabel')}</label>
                <InputPassword
                  id={`new-password-${user.id}`}
                  value={newPassword}
                  onValueChange={(e: { value: string | null }) => setNewPassword(e.value ?? '')}
                  defaultMask
                />
              </div>
              <div className="admin-field">
                <label htmlFor={`confirm-password-${user.id}`}>
                  {t('accounts.confirmPasswordLabel')}
                </label>
                <InputPassword
                  id={`confirm-password-${user.id}`}
                  value={confirmPassword}
                  onValueChange={(e: { value: string | null }) => setConfirmPassword(e.value ?? '')}
                  defaultMask
                />
              </div>
              <Button size="small" onClick={handlePasswordSubmit} disabled={setPassword.isPending}>
                {t('accounts.actionConfirmPasswordChange')}
              </Button>
            </div>
          </td>
        </tr>
      ) : null}
      {message ? (
        <tr>
          <td colSpan={5}>
            <p
              className={`admin-message admin-message-${message.kind}`}
              role={message.kind === 'error' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          </td>
        </tr>
      ) : null}
    </>
  );
}
