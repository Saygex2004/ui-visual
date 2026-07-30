// The workspace's activity timeline (UI §4.5): newest-first (already sorted
// server-side), read-only, naming the actor and the moment for every event.
import { useTranslation } from 'react-i18next';
import { useListingActivity } from './hooks.js';
import { activityLabelFor } from './activityLabels.js';
import { formatTimestamp } from '../dashboard/DataTable/formatting.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';

export function ActivityTimeline({ listingId }: { listingId: string }) {
  const { t } = useTranslation('workspace');
  const { data, isLoading, isError } = useListingActivity(listingId, true);

  if (isLoading) return <StatusDisplay variant="loading" message={t('activity.loading')} />;
  if (isError || !data) return <StatusDisplay variant="error" message={t('activity.loadError')} />;
  if (data.events.length === 0)
    return <StatusDisplay variant="empty" message={t('activity.empty')} />;

  return (
    <ul className="workspace-timeline">
      {data.events.map((event, index) => {
        const { key, params } = activityLabelFor(event, (value) =>
          t(`dashboard:rating.value.${value}`),
        );
        return (
          <li key={index} className="workspace-timeline-item">
            <span className="workspace-timeline-moment">{formatTimestamp(event.at)}</span>
            <span className="workspace-timeline-body">
              <strong>{event.actor_username ?? t('activity.systemActor')}</strong> {t(key, params)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
