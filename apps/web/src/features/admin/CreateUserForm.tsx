// Create-account form (UI §8.1): username, password, role choice.
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '../../components/TextInput.js';
import { PasswordInput } from '../../components/PasswordInput.js';
import { Button } from '../../components/Button.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import type { Role } from '@pvp/shared';
import { useCreateUser } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';

export function CreateUserForm() {
  const { t } = useTranslation('admin');
  const createUser = useCreateUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    createUser.mutate(
      { username, password, role },
      {
        onSuccess: (data) => {
          setSuccessMessage(t('accounts.createSuccess', { username: data.user.username }));
          setUsername('');
          setPassword('');
          setRole('user');
        },
        onError: (err) =>
          setErrorMessage(translateApiError(t, err, t('accounts.createGenericError'))),
      },
    );
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h2 className="admin-form-title">{t('accounts.createTitle')}</h2>
      <div className="admin-form-row">
        <div className="admin-field">
          <label htmlFor="create-username">{t('accounts.usernameLabel')}</label>
          <TextInput
            id="create-username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="create-password">{t('accounts.passwordLabel')}</label>
          <PasswordInput id="create-password" required value={password} onChange={setPassword} />
        </div>
        <fieldset className="admin-field admin-role-fieldset">
          <legend>{t('accounts.roleLabel')}</legend>
          <label className="admin-role-option">
            <input
              type="radio"
              name="create-role"
              value="user"
              checked={role === 'user'}
              onChange={() => setRole('user')}
            />
            {t('accounts.roleUser')}
          </label>
          <label className="admin-role-option">
            <input
              type="radio"
              name="create-role"
              value="admin"
              checked={role === 'admin'}
              onChange={() => setRole('admin')}
            />
            {t('accounts.roleAdmin')}
          </label>
        </fieldset>
      </div>
      {errorMessage ? <StatusDisplay variant="error" message={errorMessage} /> : null}
      {successMessage ? <StatusDisplay variant="success" message={successMessage} /> : null}
      <Button type="submit" disabled={createUser.isPending}>
        {t('accounts.createSubmit')}
      </Button>
    </form>
  );
}
