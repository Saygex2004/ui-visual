// "Scegli una vista" landing screen (UI §2.2). Selecting an option enters
// that area on its first cluster immediately — no confirmation step.
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { AreaSlug } from '@pvp/shared';
import './dashboard.css';

const AREAS: { slug: AreaSlug; titleKey: string; descriptionKey: string }[] = [
  {
    slug: 'immobili',
    titleKey: 'landing.immobiliTitle',
    descriptionKey: 'landing.immobiliDescription',
  },
  {
    slug: 'crediti',
    titleKey: 'landing.creditiTitle',
    descriptionKey: 'landing.creditiDescription',
  },
];

export function LandingScreen() {
  const { t } = useTranslation('dashboard');
  return (
    <main className="landing-screen">
      <h1 className="landing-title">{t('landing.title')}</h1>
      <div className="landing-options">
        {AREAS.map((area) => (
          <Link
            key={area.slug}
            to="/aste/$area"
            params={{ area: area.slug }}
            search={{ cluster: 1, tab: 'principali', dir: 'asc' }}
            className="landing-option"
          >
            <span className="landing-option-title">{t(area.titleKey)}</span>
            <span className="landing-option-description">{t(area.descriptionKey)}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
