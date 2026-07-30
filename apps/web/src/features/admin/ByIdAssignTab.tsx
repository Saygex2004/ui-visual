// Admin calendar assignment — by id (UI §8.3.3), the only path corporate
// listings enter a calendar. Search across both areas by id/court/
// municipality/region/description; completed rows are shown but disabled;
// nonexistent/already-completed ids are skipped server-side and reported.
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '../../components/TextInput.js';
import { Button } from '../../components/Button.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { useAdminUsers, useListingSearch, useByIdAssign } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';

export function ByIdAssignTab() {
  const { t } = useTranslation('admin');
  const { data: usersData } = useAdminUsers();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    assigned: string[];
    skipped: Array<{ id: string; reason: string }>;
  } | null>(null);

  const { data: searchData, isLoading } = useListingSearch(submittedQuery, submittedQuery !== '');
  const byIdAssign = useByIdAssign();
  const users = usersData?.users.filter((u) => !u.disabled) ?? [];
  const results = searchData?.results ?? [];

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function handleAssign() {
    setErrorMessage(null);
    setResult(null);
    if (selected.size === 0 || !userId || !date) return;
    byIdAssign.mutate(
      { user_id: userId, date, listing_ids: [...selected] },
      {
        onSuccess: (data) => {
          setResult(data);
          setSelected(new Set());
        },
        onError: (err) =>
          setErrorMessage(translateApiError(t, err, t('calendarAssignment.genericError'))),
      },
    );
  }

  return (
    <div className="admin-form">
      <form className="admin-form-row" onSubmit={handleSearch}>
        <div className="admin-field">
          <label htmlFor="byid-search">{t('calendarAssignment.byId.searchLabel')}</label>
          <TextInput
            id="byid-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('calendarAssignment.byId.searchPlaceholder')}
          />
        </div>
        <Button type="submit">{t('calendarAssignment.byId.searchSubmit')}</Button>
      </form>

      {isLoading ? (
        <StatusDisplay variant="loading" message={t('calendarAssignment.loading')} />
      ) : null}
      {submittedQuery !== '' && !isLoading && results.length === 0 ? (
        <StatusDisplay variant="empty" message={t('calendarAssignment.byId.noResults')} />
      ) : null}

      {results.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{' '}</th>
                <th>{t('calendarAssignment.byId.columnId')}</th>
                <th>{t('calendarAssignment.byId.columnArea')}</th>
                <th>{t('calendarAssignment.byId.columnType')}</th>
                <th>{t('calendarAssignment.byId.columnCourt')}</th>
                <th>{t('calendarAssignment.byId.columnPlace')}</th>
                <th>{t('calendarAssignment.byId.columnValue')}</th>
                <th>{t('calendarAssignment.byId.columnCompleted')}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      disabled={row.completed}
                      onChange={() => toggleOne(row.id)}
                    />
                  </td>
                  <td>{row.id}</td>
                  <td>
                    {row.area === 'crediti'
                      ? t('calendarAssignment.byId.corporate')
                      : t('calendarAssignment.byId.realEstate')}
                  </td>
                  <td>{row.tipo_bene}</td>
                  <td>{row.tribunale}</td>
                  <td>{row.comune}</td>
                  <td>{row.valore_richiesto}</td>
                  <td>
                    {row.completed
                      ? t('calendarAssignment.byId.completedYes')
                      : t('calendarAssignment.byId.completedNo')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="admin-form-row">
        <div className="admin-field">
          <label htmlFor="byid-user">{t('calendarAssignment.userLabel')}</label>
          <select id="byid-user" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{t('calendarAssignment.userPlaceholder')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="byid-date">{t('calendarAssignment.dateLabel')}</label>
          <TextInput
            id="byid-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {errorMessage ? <StatusDisplay variant="error" message={errorMessage} /> : null}
      {result ? (
        <>
          <StatusDisplay
            variant="success"
            message={t('calendarAssignment.byId.assignedResult', { count: result.assigned.length })}
          />
          {result.skipped.length > 0 ? (
            <ul className="admin-skip-reasons">
              {result.skipped.map((s) => (
                <li key={s.id}>
                  {s.id}
                  {' — '}
                  {t(`calendarAssignment.byId.skipReason.${s.reason}`)}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <Button
        type="button"
        onClick={handleAssign}
        disabled={byIdAssign.isPending || selected.size === 0 || !userId || !date}
      >
        {t('calendarAssignment.byId.assignSubmit')}
      </Button>
    </div>
  );
}
