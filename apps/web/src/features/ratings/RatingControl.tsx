// The shared Valutazione control (UI §5, redesigned in Execution Plan
// Phase 13): a segmented row of three options — colored dot + label — used
// in the workspace drawer. Selecting the already-active option clears it —
// exactly one (or none) active at a time. Table rows no longer embed the
// editable control: they show the read-only `RatingDot` (the row-level
// `data-rating` marking in DataTable.tsx is driven by the same joined
// value), and editing happens here in the drawer (owner decision, Phase 13).
import { useTranslation } from 'react-i18next';
import { RATING_VALUES, type RatingValue } from '@pvp/shared';
import { useSetRating, useClearRating } from './hooks.js';
import './ratings.css';

export interface RatingControlProps {
  listingId: string;
  value: RatingValue | null;
}

export function RatingControl({ listingId, value }: RatingControlProps) {
  const { t } = useTranslation('dashboard');
  const setRating = useSetRating();
  const clearRating = useClearRating();
  const pending = setRating.isPending || clearRating.isPending;

  function handleClick(option: RatingValue) {
    if (value === option) clearRating.mutate({ listingId });
    else setRating.mutate({ listingId, value: option });
  }

  return (
    <div className="rating-control" role="group" aria-label={t('rating.groupLabel')}>
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
            <span className="rating-dot" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Read-only rating indicator for table rows (Phase 13): a colored dot with
 *  the rating name as its tooltip/AT label; grey ring when unrated. */
export function RatingDot({ value }: { value: RatingValue | null }) {
  const { t } = useTranslation('dashboard');
  const label = value == null ? t('rating.none') : t(`rating.value.${value}`);
  return (
    <span
      className={`rating-indicator${value ? ` rating-indicator-${value}` : ''}`}
      role="img"
      title={label}
      aria-label={label}
    />
  );
}
