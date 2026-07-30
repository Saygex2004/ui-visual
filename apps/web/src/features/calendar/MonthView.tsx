// Calendar month view (UI §7.1) — Monday-first grid, prev/next, today
// marked, completed/assigned badge with progress state, actionable flag,
// legend, day selection. Badges/actionable are computed server-side
// (module's own join of calendar_days + assignment_index + live ratings);
// this component only renders what the API already decided.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthDay } from '@pvp/shared';
import { useMonth } from './hooks.js';
import { todayIso } from '../dashboard/sessionArchive.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import './calendar.css';

function monthOf(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(y, m, 0).getDate();
}

// Monday-first day-of-week index: JS Date#getDay() is 0=Sunday..6=Saturday.
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const label = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type GridCell = { date: string } | { date: null };

function buildGrid(month: string): GridCell[] {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const leadingBlank = mondayIndex(new Date(y, m - 1, 1));
  const total = daysInMonth(month);

  const cells: GridCell[] = [];
  for (let i = 0; i < leadingBlank; i++) cells.push({ date: null });
  for (let d = 1; d <= total; d++) cells.push({ date: `${month}-${String(d).padStart(2, '0')}` });
  while (cells.length % 7 !== 0) cells.push({ date: null });
  return cells;
}

function progressState(info: MonthDay | undefined): 'none' | 'some' | 'all' {
  if (!info || info.assigned === 0) return 'none';
  if (info.completed >= info.assigned) return 'all';
  return info.completed > 0 ? 'some' : 'none';
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function MonthView() {
  const { t } = useTranslation('calendar');
  const search = useSearch({ from: '/protected-layout/calendario' });
  const navigate = useNavigate({ from: '/calendario' });
  const today = todayIso();
  const month = search.mese ?? monthOf(today);

  const { data, isLoading, isError } = useMonth(month);
  const cells = useMemo(() => buildGrid(month), [month]);
  const dayByDate = useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);

  function goToMonth(target: string) {
    void navigate({ search: { mese: target } });
  }

  return (
    <div className="calendar-month-view">
      <div className="calendar-month-header">
        <button
          type="button"
          className="calendar-month-nav"
          onClick={() => goToMonth(shiftMonth(month, -1))}
          aria-label={t('month.previous')}
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <h1 className="calendar-month-title">{formatMonthLabel(month)}</h1>
        <button
          type="button"
          className="calendar-month-nav"
          onClick={() => goToMonth(shiftMonth(month, 1))}
          aria-label={t('month.next')}
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>

      {isLoading ? <StatusDisplay variant="loading" message={t('loading')} /> : null}
      {isError ? <StatusDisplay variant="error" message={t('loadError')} /> : null}

      {!isLoading && !isError ? (
        <>
          <div className="calendar-grid">
            {WEEKDAY_KEYS.map((key) => (
              <div key={key} className="calendar-weekday-cell">
                {t(`weekday.${key}`)}
              </div>
            ))}
            {cells.map((cell, index) => {
              if (cell.date === null) {
                return <div key={index} className="calendar-day-cell calendar-day-cell-empty" />;
              }
              const info = dayByDate.get(cell.date);
              const state = progressState(info);
              return (
                <Link
                  key={cell.date}
                  to="/calendario/$date"
                  params={{ date: cell.date }}
                  className="calendar-day-cell"
                  data-today={cell.date === today ? '' : undefined}
                  data-progress={state}
                >
                  <span className="calendar-day-number">{Number(cell.date.slice(-2))}</span>
                  {info && info.assigned > 0 ? (
                    <span className="calendar-day-badge">
                      {info.completed}
                      {'/'}
                      {info.assigned}
                    </span>
                  ) : null}
                  {info?.actionable ? (
                    <span className="calendar-day-actionable" aria-label={t('legend.actionable')} />
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="calendar-legend">
            <p>{t('legend.autoAssign')}</p>
            <p>{t('legend.badge')}</p>
            <p>{t('legend.permanent')}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
