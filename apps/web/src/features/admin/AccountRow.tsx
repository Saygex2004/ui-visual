// One row of the accounts table (UI §8.1): lifecycle actions with
// confirmation and outcome messages. Phase 13 moved the confirmation step
// from the browser's native `window.confirm` onto the shared ConfirmDialog,
// so it carries the application's own copy, layout and focus behaviour like
// every other confirmation.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '../../components/PasswordInput.js';
import { Button } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
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
  const [pending, setPending] = useState<'role' | 'disabled' | null>(null);

  const nextRole = user.role === 'admin' ? 'user' : 'admin';
  const nextDisabled = !user.disabled;

  function report(err: unknown, fallbackKey: string) {
    setMessage({ kind: 'error', text: translateApiError(t, err, t(fallbackKey)) });
  }

  function confirmRoleToggle() {
    setMessage(null);
    setRole.mutate(
      { userId: user.id, role: nextRole },
      {
        onSuccess: () => setMessage({ kind: 'success', text: t('accounts.roleChanged') }),
        onError: (err) => report(err, 'accounts.roleChangeGenericError'),
      },
    );
  }

  function confirmDisabledToggle() {
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
            onClick={() => setPending('role')}
            disabled={isLastAdminGuess}
          >
            {user.role === 'admin' ? t('accounts.actionDemote') : t('accounts.actionPromote')}
          </Button>
          <Button
            size="small"
            severity={user.disabled ? 'success' : 'danger'}
            onClick={() => setPending('disabled')}
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
                <PasswordInput
                  id={`new-password-${user.id}`}
                  value={newPassword}
                  onChange={setNewPassword}
                />
              </div>
              <div className="admin-field">
                <label htmlFor={`confirm-password-${user.id}`}>
                  {t('accounts.confirmPasswordLabel')}
                </label>
                <PasswordInput
                  id={`confirm-password-${user.id}`}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
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
            <StatusDisplay variant={message.kind} message={message.text} />
          </td>
        </tr>
      ) : null}
      <ConfirmDialog
        open={pending != null}
        title={
          pending === 'role'
            ? nextRole === 'admin'
              ? t('accounts.actionPromote')
              : t('accounts.actionDemote')
            : nextDisabled
              ? t('accounts.actionDisable')
              : t('accounts.actionEnable')
        }
        description={
          pending === 'role'
            ? nextRole === 'admin'
              ? t('accounts.confirmPromote', { username: user.username })
              : t('accounts.confirmDemote', { username: user.username })
            : nextDisabled
              ? t('accounts.confirmDisable', { username: user.username })
              : t('accounts.confirmEnable', { username: user.username })
        }
        confirmLabel={t('common:actions.confirm')}
        cancelLabel={t('common:actions.cancel')}
        destructive={pending === 'disabled' && nextDisabled}
        onConfirm={() => {
          if (pending === 'role') confirmRoleToggle();
          else confirmDisabledToggle();
        }}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      />
    </>
  );
}
