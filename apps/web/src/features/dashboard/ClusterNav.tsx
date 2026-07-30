// Cluster navigation bar (UI §2.3/§2.4): one entry per cluster (area-local
// number + name) + a separated Archivio entry, sideways-scrollable, active
// entry highlighted. Presentational — renders only the tab list; the caller
// (AreaView) owns the surrounding `TabsRoot` so the tabs and their panels
// share one controlled value bound to the URL `cluster` param. Radix's
// compound Tabs parts give correct ARIA tablist/tab semantics "for free"
// (see HANDOFF_PHASE_4.md for the PrimeReact-era precedent this replaces).
import { TabsList, TabsTab } from '../../components/Tabs.js';
import { useTranslation } from 'react-i18next';

export interface ClusterNavEntry {
  value: string;
  labelKey: string;
  number?: number;
}

export function ClusterNav({ entries }: { entries: ClusterNavEntry[] }) {
  const { t } = useTranslation('dashboard');
  return (
    <TabsList className="cluster-nav">
      {entries.map((entry) => (
        <TabsTab key={entry.value} value={entry.value} className="cluster-nav-tab">
          {entry.number != null ? <span className="cluster-nav-number">{entry.number}</span> : null}
          {t(entry.labelKey)}
        </TabsTab>
      ))}
    </TabsList>
  );
}
