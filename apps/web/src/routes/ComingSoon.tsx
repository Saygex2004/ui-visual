import { useTranslation } from 'react-i18next';

// Minimal placeholder for routes owned by later phases (Calendario: Phase 8,
// Le mie chat: Phase 7) — reachable from the user menu without a dead link or
// crash, per FRONTEND.md's "resist scaffolding ahead": no feature logic here.
export function ComingSoon() {
  const { t } = useTranslation('common');
  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <p>{t('comingSoon')}</p>
    </div>
  );
}
