// Forced first-sign-in password change (UI §2.1, API_CONTRACT.md §2). Blocking
// — rendered instead of the app shell while `must_change_password` is set;
// the server enforces the gate on every other route regardless.
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '../../components/PasswordInput.js';
import { Button } from '../../components/Button.js';
import { useChangePassword } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';
import './auth.css';

export function ForcedPasswordChange() {
  const { t } = useTranslation('auth');
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('errors:auth.passwordMismatch'));
      return;
    }

    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onError: (err) =>
          setErrorMessage(translateApiError(t, err, t('forcedChange.genericError'))),
      },
    );
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">{t('forcedChange.title')}</h1>
        <p className="auth-subtitle">{t('forcedChange.description')}</p>
        <div className="auth-field">
          <label htmlFor="fpc-current">{t('forcedChange.currentPasswordLabel')}</label>
          <PasswordInput
            id="fpc-current"
            name="current_password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={setCurrentPassword}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="fpc-new">{t('forcedChange.newPasswordLabel')}</label>
          <PasswordInput
            id="fpc-new"
            name="new_password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={setNewPassword}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="fpc-confirm">{t('forcedChange.confirmPasswordLabel')}</label>
          <PasswordInput
            id="fpc-confirm"
            name="confirm_password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </div>
        {errorMessage ? (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={changePassword.isPending}>
          {t('forcedChange.submit')}
        </Button>
      </form>
    </main>
  );
}
