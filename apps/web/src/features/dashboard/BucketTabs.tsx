// Bucket tabs — Procedure principali / Fallimenti (UI §3.1), each with a
// count badge. Phase 13: the shared underline-tab voice (components/tabs.css)
// replaces the old button-look chrome, so these read unmistakably as tabs;
// they sit flush on top of the filter card (dashboard.css). Presentational —
// the caller owns `TabsRoot`. The accessible name stays "label + count"
// (e2e contract: `role=tab, name='Procedure principali 6'`).
import { TabsList, TabsTab } from '../../components/Tabs.js';
import { useTranslation } from 'react-i18next';
import type { BucketTab } from './urlState.js';

export function BucketTabs({
  principaliCount,
  fallimentiCount,
}: {
  principaliCount: number;
  fallimentiCount: number;
}) {
  const { t } = useTranslation('dashboard');
  const tabs: { value: BucketTab; labelKey: string; count: number }[] = [
    { value: 'principali', labelKey: 'bucket.principali', count: principaliCount },
    { value: 'fallimenti', labelKey: 'bucket.fallimenti', count: fallimentiCount },
  ];

  return (
    <TabsList className="ui-tabs-list bucket-tabs">
      {tabs.map((tab) => (
        <TabsTab key={tab.value} value={tab.value} className="ui-tab">
          {t(tab.labelKey)}
          <span className="ui-badge bucket-tab-count">{tab.count}</span>
        </TabsTab>
      ))}
    </TabsList>
  );
}
