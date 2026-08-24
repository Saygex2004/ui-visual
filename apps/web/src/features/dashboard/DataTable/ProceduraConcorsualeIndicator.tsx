// Table-row presence indicator for a matched procedura concorsuale
// (DOMAIN_RULES.md §12) — a flag only, not a data preview; the workspace
// Dettagli tab is where the matched procedure's facts actually render.
// Structurally parallel to the calendar's own simple presence dot
// (CALENDAR_BLOCCO in columns.tsx), but externalizes its tooltip text
// (SPECIFICATIONS.md's no-literal-string rule) via its own `useTranslation`,
// which a plain ColumnDef.render function may not call directly.
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ProceduraConcorsualeIndicator({ present }: { present: boolean }) {
  const { t } = useTranslation('dashboard');
  if (!present) return null;
  return (
    <span className="procedura-indicator" title={t('proceduraConcorsuale.tableIndicatorTitle')}>
      <FileText aria-hidden="true" size={15} />
    </span>
  );
}
