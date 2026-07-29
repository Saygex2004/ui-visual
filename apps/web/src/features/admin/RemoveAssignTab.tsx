// Admin calendar assignment — removal (UI §8.3.2). Severs the calendar link
// only: never touches the listing or any rating it carries (server-enforced,
// DATA_MODEL.md §11 — a completed assignment_index entry survives removal).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useAdminUsers, useAssignedForRemoval, useRemoveAssignments } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';

export function RemoveAssignTab() {
  const { t } = useTranslation('admin');
  const { data: usersData } = useAdminUsers();
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removedCount, setRemovedCount] = useState<number | null>(null);

  const ready = userId !== '' && date !== '';
  const { data, isLoading } = useAssignedForRemoval(userId, date, ready);
  const removeAssignments = useRemoveAssignments();
  const listings = data?.listings ?? [];

  const users = usersData?.users.filter((u) => !u.disabled) ?? [];
  const allSelected = listings.length > 0 && selected.size === listings.length;

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(listings.map((l) => l.id)));
  }

  function handleRemove() {
    setErrorMessage(null);
    setRemovedCount(null);
    if (selected.size === 0) return;
    if (!window.confirm(t('calendarAssignment.removal.confirm', { count: selected.size }))) return;
    removeAssignments.mutate(
      { userId, date, listingIds: [...selected] },
      {
        onSuccess: (result) => {
          setRemovedCount(result.removed.length);
          setSelected(new Set());
        },
        onError: (err) =>
          setErrorMessage(translateApiError(t, err, t('calendarAssignment.genericError'))),
      },
    );
  }

  return (
    <div className="admin-form">
      <div className="admin-form-row">
        <div className="admin-field">
          <label htmlFor="removal-user">{t('calendarAssignment.userLabel')}</label>
          <select
            id="removal-user"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setSelected(new Set());
            }}
          >
            <option value="">{t('calendarAssignment.userPlaceholder')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="removal-date">{t('calendarAssignment.dateLabel')}</label>
          <InputText
            id="removal-date"
            type="date"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setDate(e.target.value);
              setSelected(new Set());
            }}
          />
        </div>
      </div>

      {ready && isLoading ? (
        <p className="admin-message">{t('calendarAssignment.loading')}</p>
      ) : null}
      {ready && !isLoading && listings.length === 0 ? (
        <p className="admin-message">{t('calendarAssignment.removal.empty')}</p>
      ) : null}

      {listings.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={t('calendarAssignment.removal.selectAll')}
                    />
                  </th>
                  <th>{t('calendarAssignment.byId.columnId')}</th>
                  <th>{t('calendarAssignment.byId.columnType')}</th>
                  <th>{t('calendarAssignment.byId.columnCourt')}</th>
                  <th>{t('calendarAssignment.byId.columnPlace')}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                      />
                    </td>
                    <td>{row.id}</td>
                    <td>{row.tipo_bene}</td>
                    <td>{row.tribunale}</td>
                    <td>{row.comune}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errorMessage ? (
            <p className="admin-message admin-message-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {removedCount != null ? (
            <p className="admin-message admin-message-success" role="status">
              {t('calendarAssignment.removal.result', { count: removedCount })}
            </p>
          ) : null}
          <Button
            type="button"
            onClick={handleRemove}
            disabled={removeAssignments.isPending || selected.size === 0}
          >
            {t('calendarAssignment.removal.submit')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
