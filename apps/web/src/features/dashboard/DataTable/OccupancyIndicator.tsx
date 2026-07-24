// Occupancy at a glance (UI §4.3) — a distinct indicator per state alongside
// its label. Fixed 6-value domain enum (OCCUPANCY_LABELS), so — like cluster
// names — it goes through the i18n catalog even though `it` is the only
// locale (FRONTEND.md §6), unlike open-ended scraped text (tribunale, comune).
import { useTranslation } from 'react-i18next';
import type { OccupancyLabel } from '@pvp/shared';

const SLUGS: Record<OccupancyLabel, string> = {
  Libero: 'libero',
  Occupato: 'occupato',
  'Occupato senza titolo': 'occupato_senza_titolo',
  'In corso di liberazione': 'in_liberazione',
  'Parzialmente occupato': 'parzialmente_occupato',
  'Non specificato': 'non_specificato',
};

export function OccupancyIndicator({ value }: { value: string }) {
  const { t } = useTranslation('dashboard');
  const slug = SLUGS[value as OccupancyLabel] ?? SLUGS['Non specificato'];
  return (
    <span className={`occupancy-indicator occupancy-${slug.replace(/_/g, '-')}`}>
      <span className="occupancy-dot" aria-hidden="true" />
      {t(`occupancy.${slug}`, { defaultValue: value })}
    </span>
  );
}
