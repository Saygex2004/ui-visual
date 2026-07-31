// Calendar day view (UI §7.2) — date heading, live progress line, the day's
// table via the Phase 4 table system (CALENDAR_COLUMNS, admin-only ID,
// Valutazione/quick-chat unchanged). Opening this route on today's date is
// what triggers automatic assignment server-side (calendarRepo.assignToday,
// via GET /calendar/day/:date) — this component doesn't know or care, it
// just renders whatever the API returns.
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { areaSearchSchema } from '../dashboard/urlState.js';
import { DataTable } from '../dashboard/DataTable/DataTable.js';
import { getColumns } from '../dashboard/DataTable/columns.js';
import { useDay } from './hooks.js';
import { toTableRow } from './adapter.js';
import { useRatingsMap } from '../ratings/hooks.js';
import { useMyThreadsMap } from '../chat/hooks.js';
import { useMe } from '../auth/hooks.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { translateLoadError } from '../../lib/translateApiError.js';
import './calendar.css';

// The workspace route (opened from a row's actions) needs an AreaSearch-
// shaped object to spread into its own search params — this page isn't an
// area view, so there's nothing meaningful to remember; every field falls
// back to its `.catch()` default, a harmless landing state.
const BLANK_AREA_SEARCH = areaSearchSchema.parse({});

function formatDayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const label = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function DayView() {
  const { t } = useTranslation('calendar');
  const { date } = useParams({ from: '/protected-layout/calendario/$date' });
  const { data, isLoading, isError, error } = useDay(date);
  const ratings = useRatingsMap();
  const chatsByListing = useMyThreadsMap();
  const { data: me } = useMe();
  const isAdmin = me?.user.role === 'admin';

  const columns = getColumns('calendar', { showIdColumn: isAdmin });
  const rows = (data?.listings ?? []).map(toTableRow);

  return (
    <div className="calendar-day-view">
      <Link to="/calendario" className="calendar-day-back">
        {t('back')}
      </Link>
      <h1 className="calendar-day-title">{formatDayLabel(date)}</h1>

      {isLoading ? <StatusDisplay variant="loading" message={t('loading')} /> : null}
      {isError ? (
        <StatusDisplay variant="error" message={translateLoadError(t, error, 'loadError')} />
      ) : null}

      {data ? (
        <>
          <p className="calendar-day-progress" role="status">
            {t('day.progress', { completed: data.progress.completed, total: data.progress.total })}
          </p>
          {rows.length === 0 ? (
            <StatusDisplay variant="empty" message={t('day.empty')} />
          ) : (
            <DataTable
              rows={rows}
              columns={columns}
              columnContext={{
                bloccoIndex: {},
                activeBlocco: null,
                currentClusterKey: null,
                clusters: [],
                ratings,
                onIsolate: () => {},
                onJump: () => {},
              }}
              ratings={ratings}
              chatsByListing={chatsByListing}
              area="immobili"
              search={BLANK_AREA_SEARCH}
              sortKey={undefined}
              sortDir="asc"
              onSort={() => {}}
              emptyMessage={t('day.empty')}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
