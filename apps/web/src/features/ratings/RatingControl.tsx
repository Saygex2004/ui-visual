// The shared Valutazione control (UI §5): three options, marking the whole
// row to match (the row-level `data-rating` marking lives in DataTable.tsx,
// driven by the same joined value this control writes). Selecting the
// already-active option clears it — exactly one (or none) active at a time.
// `compact` (the table's frozen actions column) renders a colored dot per
// option with no visible text, same icon-with-title-not-label precedent as
// Phase 5's BloccoBadge/BloccoJumpChooser; the workspace renders full labels.
import { useTranslation } from 'react-i18next';
import { RATING_VALUES, type RatingValue } from '@pvp/shared';
import { useSetRating, useClearRating } from './hooks.js';
import './ratings.css';

export interface RatingControlProps {
  listingId: string;
  value: RatingValue | null;
  compact?: boolean;
}

export function RatingControl({ listingId, value, compact }: RatingControlProps) {
  const { t } = useTranslation('dashboard');
  const setRating = useSetRating();
  const clearRating = useClearRating();
  const pending = setRating.isPending || clearRating.isPending;

  function handleClick(option: RatingValue) {
    if (value === option) clearRating.mutate({ listingId });
    else setRating.mutate({ listingId, value: option });
  }

  return (
    <div
      className={`rating-control${compact ? ' rating-control-compact' : ''}`}
      role="group"
      aria-label={t('rating.groupLabel')}
    >
      {RATING_VALUES.map((option) => {
        const label = t(`rating.value.${option}`);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            className={`rating-option rating-option-${option}`}
            title={label}
            aria-label={label}
            disabled={pending}
            onClick={() => handleClick(option)}
          >
            {compact ? <span className="rating-dot" aria-hidden="true" /> : label}
          </button>
        );
      })}
    </div>
  );
}
