// One group of form fields, with a badge saying how many of its required
// fields are still empty — a tick when none are.
//
// The count lives beside the heading rather than only at the bottom because
// these documents have 48 fields across nine groups: without it you cannot
// tell which group still needs you without opening every one.
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface SectionProps {
  title: string;
  /** Required fields still empty. Omit for a group with nothing required. */
  missing?: string[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({
  title,
  missing,
  collapsible = false,
  defaultOpen = true,
  children,
}: SectionProps) {
  const { t } = useTranslation('carta');
  const [open, setOpen] = useState(defaultOpen);
  const completa = missing?.length === 0;

  return (
    <section className="carta-section">
      <div className="carta-section-head">
        {collapsible ? (
          <button
            type="button"
            className="carta-section-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <span className="ui-micro-label">{title}</span>
            <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          </button>
        ) : (
          <span className="ui-micro-label">{title}</span>
        )}
        {missing ? (
          <span className={`carta-badge ${completa ? 'is-complete' : 'is-missing'}`}>
            {completa ? '✓' : missing.length}
          </span>
        ) : null}
      </div>
      {open ? (
        <div className="carta-section-body">
          {missing && !completa ? (
            <p className="carta-missing">
              {t('states.sectionMissing', { campi: missing.join(', ') })}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}
