// Bucket tabs — Procedure principali / Fallimenti (UI §3.1), each with a
// count badge; Fallimenti visually set apart (old-law bankruptcy context).
// Presentational, same pattern as ClusterNav — the caller owns `TabsRoot`.
import { TabsList, TabsTab } from 'primereact/tabs';
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
  const tabs: { value: BucketTab; labelKey: string; count: number; className?: string }[] = [
    { value: 'principali', labelKey: 'bucket.principali', count: principaliCount },
    {
      value: 'fallimenti',
      labelKey: 'bucket.fallimenti',
      count: fallimentiCount,
      className: 'bucket-tab-fallimenti',
    },
  ];

  return (
    <TabsList className="bucket-tabs">
      {tabs.map((tab) => (
        <TabsTab key={tab.value} value={tab.value} className={`bucket-tab ${tab.className ?? ''}`}>
          {t(tab.labelKey)}
          <span className="bucket-tab-count">{tab.count}</span>
        </TabsTab>
      ))}
    </TabsList>
  );
}
