// Login screen (UI §2.1). Username + password, "Entra"; on success returns to
// the originally requested URL (the `redirect` search param).
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { TextInput } from '../../components/TextInput.js';
import { PasswordInput } from '../../components/PasswordInput.js';
import { Button } from '../../components/Button.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { useLogin } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';
import './auth.css';

export function LoginScreen({ redirectTo }: { redirectTo?: string }) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    login.mutate(
      { username, password },
      {
        onSuccess: () => {
          void navigate({ to: redirectTo && redirectTo !== '/login' ? redirectTo : '/' });
        },
        onError: (err) => setErrorMessage(translateApiError(t, err, t('login.genericError'))),
      },
    );
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">{t('login.title')}</h1>
        <div className="auth-field">
          <label htmlFor="login-username">{t('login.usernameLabel')}</label>
          <TextInput
            id="login-username"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password">{t('login.passwordLabel')}</label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={setPassword}
          />
        </div>
        {errorMessage ? <StatusDisplay variant="error" message={errorMessage} /> : null}
        <Button type="submit" disabled={login.isPending}>
          {t('login.submit')}
        </Button>
      </form>
    </main>
  );
}
