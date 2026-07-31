// Admin calendar assignment — random (UI §8.3.1). Same engine as automatic
// assignment, admin's chosen count (1-200, default 18), additive, never
// duplicates or draws ineligible listings — all enforced server-side.
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '../../components/TextInput.js';
import { Button } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { useAdminUsers, useRandomAssign } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';

const DEFAULT_COUNT = 18;

export function RandomAssignTab() {
  const { t } = useTranslation('admin');
  const { data: usersData } = useAdminUsers();
  const randomAssign = useRandomAssign();
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState('');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<string[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const users = usersData?.users.filter((u) => !u.disabled) ?? [];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setResult(null);
    if (!userId || !date) return;
    setConfirmOpen(true);
  }

  // Phase 13: the confirmation step is the shared ConfirmDialog, not the
  // browser's native confirm.
  function runAssign() {
    randomAssign.mutate(
      { user_id: userId, date, count },
      {
        onSuccess: (data) => setResult(data.assigned),
        onError: (err) =>
          setErrorMessage(translateApiError(t, err, t('calendarAssignment.genericError'))),
      },
    );
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-row">
        <div className="admin-field">
          <label htmlFor="random-user">{t('calendarAssignment.userLabel')}</label>
          <select
            id="random-user"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
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
          <label htmlFor="random-date">{t('calendarAssignment.dateLabel')}</label>
          <TextInput
            id="random-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="random-count">{t('calendarAssignment.countLabel')}</label>
          <TextInput
            id="random-count"
            type="number"
            min={1}
            max={200}
            required
            value={String(count)}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
          />
        </div>
      </div>
      {errorMessage ? <StatusDisplay variant="error" message={errorMessage} /> : null}
      {result ? (
        <StatusDisplay
          variant="success"
          message={t('calendarAssignment.random.result', { count: result.length })}
        />
      ) : null}
      <Button type="submit" disabled={randomAssign.isPending || !userId || !date}>
        {t('calendarAssignment.random.submit')}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        title={t('calendarAssignment.random.submit')}
        description={t('calendarAssignment.random.confirm', { count, date })}
        confirmLabel={t('common:actions.confirm')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={runAssign}
        onOpenChange={setConfirmOpen}
      />
    </form>
  );
}
