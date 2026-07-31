// Administration — Activity (admin events + scraper runs, both display-only;
// FRONTEND.md's "Admin events + scraper runs" screen). `runs` never drives
// any feature decision (DATA_MODEL.md §1/§6) — this table exists purely so
// an admin can see what the scraper last did.
import { useTranslation } from 'react-i18next';
import type { AdminEventView, Run } from '@pvp/shared';
import { useAdminEvents, useAdminRuns } from './hooks.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { formatTimestamp } from '../dashboard/DataTable/formatting.js';
import { translateLoadError } from '../../lib/translateApiError.js';
import './admin.css';

function EventRow({ event }: { event: AdminEventView }) {
  const { t } = useTranslation('admin');
  return (
    <tr>
      <td>{formatTimestamp(event.at)}</td>
      <td>{t(`activity.eventType.${event.type}`)}</td>
      <td>{event.actor_id}</td>
      <td>{event.subject}</td>
    </tr>
  );
}

function RunRow({ run }: { run: Run }) {
  const { t } = useTranslation('admin');
  return (
    <tr>
      <td>{formatTimestamp(run.started_at)}</td>
      <td>{t(`activity.runScope.${run.scope}`)}</td>
      <td>{t(`activity.runStatus.${run.status}`)}</td>
      <td>{run.total_enumerated}</td>
      <td>{run.written}</td>
      <td>{run.archived}</td>
      <td>{run.errors}</td>
    </tr>
  );
}

export function AdminActivityScreen() {
  const { t } = useTranslation('admin');
  const events = useAdminEvents();
  const runs = useAdminRuns();

  return (
    <div className="admin-screen">
      <h1>{t('activity.title')}</h1>

      <section>
        <h2 className="admin-form-title">{t('activity.eventsTitle')}</h2>
        {events.isLoading ? (
          <StatusDisplay variant="loading" message={t('activity.loading')} />
        ) : null}
        {events.isError ? (
          <StatusDisplay
            variant="error"
            message={translateLoadError(t, events.error, 'activity.eventsLoadError')}
          />
        ) : null}
        {events.data ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('activity.columnAt')}</th>
                  <th>{t('activity.columnType')}</th>
                  <th>{t('activity.columnActor')}</th>
                  <th>{t('activity.columnSubject')}</th>
                </tr>
              </thead>
              <tbody>
                {events.data.events.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <StatusDisplay variant="empty" message={t('activity.eventsEmpty')} />
                    </td>
                  </tr>
                ) : (
                  events.data.events.map((event, i) => <EventRow key={i} event={event} />)
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="admin-form-title">{t('activity.runsTitle')}</h2>
        {runs.isLoading ? (
          <StatusDisplay variant="loading" message={t('activity.loading')} />
        ) : null}
        {runs.isError ? (
          <StatusDisplay
            variant="error"
            message={translateLoadError(t, runs.error, 'activity.runsLoadError')}
          />
        ) : null}
        {runs.data ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('activity.columnStartedAt')}</th>
                  <th>{t('activity.columnScope')}</th>
                  <th>{t('activity.columnStatus')}</th>
                  <th>{t('activity.columnEnumerated')}</th>
                  <th>{t('activity.columnWritten')}</th>
                  <th>{t('activity.columnArchived')}</th>
                  <th>{t('activity.columnErrors')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.runs.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <StatusDisplay variant="empty" message={t('activity.runsEmpty')} />
                    </td>
                  </tr>
                ) : (
                  runs.data.runs.map((run, i) => <RunRow key={i} run={run} />)
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
