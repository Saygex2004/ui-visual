import { useTranslation } from 'react-i18next';

// Placeholder landing route (/). Phase 4 replaces this with the real
// "Scegli una vista" landing. The visible text is the i18n proof string.
export function Landing() {
  const { t } = useTranslation('common');
  return (
    <main style={{ padding: 'var(--space-8)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>{t('app.name')}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>{t('app.tagline')}</p>
      <p data-testid="proof">{t('bootstrap.proof')}</p>
    </main>
  );
}
