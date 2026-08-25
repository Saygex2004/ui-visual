// "Scegli una vista" landing screen (UI §2.2, redesigned in Execution Plan
// Phase 13): last-update badge, hero heading + intro, and one card per real
// area — icon tile, "Attiva" pill, description, live listing count, "Apri"
// CTA. Selecting a card enters that area on its first cluster immediately —
// no confirmation step. Only the two real views render (owner decision: no
// "coming soon" placeholders); the grid is ready for future cards.
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Building2, Coins, FileBox } from 'lucide-react';
import { hasVista, type AreaSlug } from '@pvp/shared';
import { Badge } from '../../components/Badge.js';
import { useMe } from '../auth/hooks.js';
import { useAreaSnapshot } from './hooks.js';
import { formatTimestamp } from './DataTable/formatting.js';
import './dashboard.css';

const AREAS: {
  slug: AreaSlug;
  titleKey: string;
  descriptionKey: string;
  icon: typeof Building2;
}[] = [
  {
    slug: 'immobili',
    titleKey: 'landing.immobiliTitle',
    descriptionKey: 'landing.immobiliDescription',
    icon: Building2,
  },
  {
    slug: 'crediti',
    titleKey: 'landing.creditiTitle',
    descriptionKey: 'landing.creditiDescription',
    icon: Coins,
  },
];

export function LandingScreen() {
  const { t } = useTranslation('dashboard');
  // Pratiche is an internal archive register, not an auction area: it gets a
  // card here because this is where a view is chosen, but it is admin-only and
  // has no snapshot, so it renders separately from the AREAS loop rather than
  // being bent into an AreaSlug it would never satisfy.
  const { data: me } = useMe();
  // Rendering only; the server checks every route regardless. Falling back to
  // "nothing" while `me` loads avoids flashing cards the account cannot open.
  const conto = me?.user ?? { role: 'user' as const, viste: [] };
  const vedePratiche = hasVista(conto, 'pratiche');
  const immobili = useAreaSnapshot('immobili');
  const crediti = useAreaSnapshot('crediti');
  const snapshots = { immobili, crediti } as const;

  const lastSuccess = [immobili.data?.meta.last_success_at, crediti.data?.meta.last_success_at]
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);

  return (
    // A <div>, not a second <main> — Shell.tsx's `.shell-content` is already
    // the page's one <main> landmark; nesting a second one is an axe
    // landmark-no-duplicate-main violation (found via Phase 10's a11y
    // courtesy pass).
    <div className="landing-screen">
      <div className="landing-intro">
        {lastSuccess ? (
          <Badge variant="accent" className="landing-updated-badge">
            <span className="landing-updated-dot" aria-hidden="true" />
            {t('landing.updatedBadge', { when: formatTimestamp(lastSuccess) })}
          </Badge>
        ) : null}
        <h1 className="landing-title">{t('landing.title')}</h1>
        <p className="landing-subtitle">{t('landing.subtitle')}</p>
      </div>
      <div className="landing-options">
        {AREAS.filter((area) => hasVista(conto, area.slug)).map((area) => {
          const Icon = area.icon;
          const totalStored = snapshots[area.slug].data?.meta.total_stored;
          return (
            <Link
              key={area.slug}
              to="/aste/$area"
              params={{ area: area.slug }}
              search={{ cluster: 1, tab: 'principali', dir: 'asc' }}
              className="landing-option"
            >
              <span className="landing-option-top">
                <span className={`landing-option-icon landing-option-icon-${area.slug}`}>
                  <Icon aria-hidden="true" size={22} />
                </span>
                <Badge variant="success">{t('landing.activeBadge')}</Badge>
              </span>
              <span className="landing-option-title">{t(area.titleKey)}</span>
              <span className="landing-option-description">{t(area.descriptionKey)}</span>
              <span className="landing-option-footer">
                <span className="landing-option-stat">
                  {totalStored != null
                    ? t('landing.statCount', { count: totalStored })
                    : t('landing.statLoading')}
                </span>
                <span className="landing-option-cta">
                  {t('landing.openCta')}
                  <ArrowRight aria-hidden="true" size={14} />
                </span>
              </span>
            </Link>
          );
        })}
        {vedePratiche ? (
          <Link to="/pratiche" className="landing-option">
            <span className="landing-option-top">
              <span className="landing-option-icon landing-option-icon-pratiche">
                <FileBox aria-hidden="true" size={22} />
              </span>
              <Badge variant="accent">{t('landing.adminBadge')}</Badge>
            </span>
            <span className="landing-option-title">{t('landing.praticheTitle')}</span>
            <span className="landing-option-description">{t('landing.praticheDescription')}</span>
            <span className="landing-option-footer">
              <span className="landing-option-stat" />
              <span className="landing-option-cta">
                {t('landing.openCta')}
                <ArrowRight aria-hidden="true" size={14} />
              </span>
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
