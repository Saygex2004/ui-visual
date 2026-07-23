import { useTranslation } from 'react-i18next';

// Placeholder sign-in route (/login). Phase 3 replaces this with the real
// login screen and forced password-change flow.
export function Login() {
  const { t } = useTranslation('common');
  return (
    <main style={{ padding: 'var(--space-8)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>{t('app.name')}</h1>
    </main>
  );
}
