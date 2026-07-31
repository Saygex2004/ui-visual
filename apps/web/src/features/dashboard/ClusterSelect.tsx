// Cluster selector (UI §2.3/§2.4, redesigned in Execution Plan Phase 13):
// the space-efficient replacement for the cluster pill row — a searchable
// combobox showing the active cluster (colored dot + area-local number +
// name) whose panel lists every cluster with its live listing count, plus
// Archivio pinned after a separator. Bound to the same URL `cluster` param
// as the old tabs ('archivio' | number — `resolveClusterSelector` semantics
// unchanged). Entries come from the snapshot's own clusters, so selector
// and sections can never diverge.
import { useTranslation } from 'react-i18next';
import { Archive } from 'lucide-react';
import type { ClusterBlock } from '@pvp/shared';
import { SearchSelect, type SearchSelectOption } from '../../components/SearchSelect.js';

export interface ClusterSelectProps {
  clusters: readonly ClusterBlock[];
  value: number | 'archivio';
  archiveCount: number;
  onChange: (value: number | 'archivio') => void;
}

const CAT_COUNT = 7;

function clusterDotClass(number: number): string {
  return `cluster-dot cluster-dot-${((number - 1) % CAT_COUNT) + 1}`;
}

export function ClusterSelect({ clusters, value, archiveCount, onChange }: ClusterSelectProps) {
  const { t } = useTranslation('dashboard');

  const options: SearchSelectOption[] = clusters.map((cluster) => {
    const name = t(`cluster.name.${cluster.key}`);
    const count = cluster.buckets.principali.length + cluster.buckets.fallimenti.length;
    return {
      id: String(cluster.number),
      textValue: name,
      selected: value === cluster.number,
      label: (
        <>
          <span className={clusterDotClass(cluster.number)} aria-hidden="true" />
          <span className="cluster-select-number">{cluster.number}</span>
          <span className="cluster-select-option-text">
            <span className="cluster-select-option-name">{name}</span>
            <span className="cluster-select-option-count">
              {t('selector.clusterListingCount', { count })}
            </span>
          </span>
        </>
      ),
    };
  });

  const pinned: SearchSelectOption[] = [
    {
      id: 'archivio',
      textValue: t('archive.navLabel'),
      selected: value === 'archivio',
      label: (
        <>
          <Archive aria-hidden="true" size={15} className="cluster-select-archive-icon" />
          <span className="cluster-select-option-text">
            <span className="cluster-select-option-name">{t('archive.navLabel')}</span>
            <span className="cluster-select-option-count">
              {t('selector.clusterListingCount', { count: archiveCount })}
            </span>
          </span>
        </>
      ),
    },
  ];

  const active = value === 'archivio' ? null : clusters.find((c) => c.number === value);

  return (
    <SearchSelect
      trigger={
        active ? (
          <>
            <span className={clusterDotClass(active.number)} aria-hidden="true" />
            <span className="cluster-select-number">{active.number}</span>
            <span className="cluster-select-trigger-name">{t(`cluster.name.${active.key}`)}</span>
          </>
        ) : (
          <>
            <Archive aria-hidden="true" size={15} className="cluster-select-archive-icon" />
            <span className="cluster-select-trigger-name">{t('archive.navLabel')}</span>
          </>
        )
      }
      triggerAriaLabel={t('selector.clusterLabel')}
      searchPlaceholder={t('selector.clusterSearchPlaceholder')}
      emptyMessage={t('selector.clusterEmpty')}
      options={options}
      pinned={pinned}
      onSelect={(id) => onChange(id === 'archivio' ? 'archivio' : Number(id))}
    />
  );
}
