// The shared Valutazione control (UI §5, redesigned in Execution Plan
// Phase 13): a segmented row of three options — colored dot + label — used
// in the workspace drawer. Selecting the already-active option clears it —
// exactly one (or none) active at a time. Dashboard and archive rows no
// longer embed the editable control: they show the read-only `RatingDot`
// (the row-level `data-rating` marking in DataTable.tsx is driven by the
// same joined value), and editing happens in the drawer (owner decision,
// Phase 13).
//
// The calendar day table is the deliberate exception and keeps the `compact`
// in-row control: that screen IS a rate-through worklist (UI §7.2/§7.3 — a
// listing counts as done once rated), and its rows' workspace link leaves
// the calendar for the area view, so routing every verdict through the
// drawer would mean navigating away and back for each of the day's
// listings. Rating in the row is the point of that screen, unlike the
// dashboard where it is an occasional judgement made with the facts open.
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { RATING_VALUES, type RatingValue } from '@pvp/shared';
import { useSetRating, useClearRating } from './hooks.js';
import './ratings.css';

/** Verdict glyphs (owner request, 2026-08): the three risk dots render as
 *  emoji — great deal → rocket, to-verify → thinking, avoid → poop. This
 *  deliberately overrides design.md's "no emoji as icons" for the rating. */
const RATING_EMOJI: Record<RatingValue, string> = {
  ottimo_affare: '🚀',
  da_verificare: '🤔',
  da_evitare: '💩',
};

export interface RatingControlProps {
  listingId: string;
  value: RatingValue | null;
  /** Dots-only variant with no visible text, for the calendar day table —
   *  the one place rating is still done in the row (see below). */
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
    <div className={`rating-control-field${compact ? ' rating-control-field-compact' : ''}`}>
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
              <span className="rating-dot" aria-hidden="true">
                {RATING_EMOJI[option]}
              </span>
              {compact ? null : label}
            </button>
          );
        })}
      </div>
      {!compact && value != null ? (
        <button
          type="button"
          className="rating-clear"
          disabled={pending}
          onClick={() => clearRating.mutate({ listingId })}
        >
          <X aria-hidden="true" size={14} />
          {t('rating.clear')}
        </button>
      ) : null}
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
    >
      {value ? RATING_EMOJI[value] : null}
    </span>
  );
}
