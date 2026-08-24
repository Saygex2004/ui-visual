// The lot's published documents (DATA_MODEL.md §3.5): perizia, avviso di
// vendita, ordinanze. Each row is a direct download — the URL arrives
// absolute and ready from the scraper, so nothing here builds links.
//
// Rendered only when the lot actually publishes documents; a lot with none
// shows nothing at all rather than an empty card, matching how the OMI and
// procedura panels behave.
import { useTranslation } from 'react-i18next';
import { Download, FileText } from 'lucide-react';
import type { Allegato } from '@pvp/shared';

/** Human labels for the type codes the portal uses. Observed across a real
 *  300-listing sample (1,228 documents), commonest first. NOT a closed
 *  vocabulary — an unrecognized code falls back to the generic label rather
 *  than leaking a raw code like "XYZ" into the interface. */
const ETICHETTE: Record<string, string> = {
  PERIZ: 'documenti.tipo.perizia',
  ALTRO: 'documenti.tipo.altro',
  ORDIN: 'documenti.tipo.ordinanza',
  AVEND: 'documenti.tipo.avvisoVendita',
  STIMA: 'documenti.tipo.stima',
  PROVV: 'documenti.tipo.provvedimento',
};

function formatDimensione(bytes: number | null | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1).replace('.', ',')} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function DocumentiPanel({ allegati }: { allegati: readonly Allegato[] }) {
  const { t } = useTranslation('workspace');
  if (allegati.length === 0) return null;

  return (
    <div className="documenti-panel">
      <h3 className="documenti-panel-title">{t('documenti.title', { count: allegati.length })}</h3>
      <ul className="documenti-list">
        {allegati.map((a) => {
          const etichetta = a.tipo ? ETICHETTE[a.tipo] : undefined;
          const peso = formatDimensione(a.dimensione);
          return (
            <li key={a.url} className="documenti-item">
              <FileText aria-hidden="true" size={16} className="documenti-item-icon" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="documenti-item-link"
                // The portal serves these as octet-stream; `download` makes
                // the browser save rather than navigate away from the app.
                download={a.nome}
              >
                {a.nome}
              </a>
              <span className="documenti-item-meta">
                {etichetta ? t(etichetta) : t('documenti.tipo.altro')}
                {peso ? ` · ${peso}` : ''}
              </span>
              <Download aria-hidden="true" size={14} className="documenti-item-download" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
