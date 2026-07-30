// Participant list + add-a-colleague control (UI §6.2). Any participant may
// add one — not just admins, unlike close/reopen — hidden entirely once the
// thread is closed. The candidate picker is fetched lazily, only once
// "aggiungi" is actually clicked (`enabled: adding`), since most thread
// views never open it.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserRef } from '@pvp/shared';
import { useAddParticipant, useParticipantCandidates } from './hooks.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';

export interface ParticipantListProps {
  listingId: string;
  participants: readonly UserRef[];
  closed: boolean;
}

export function ParticipantList({ listingId, participants, closed }: ParticipantListProps) {
  const { t } = useTranslation('chat');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState('');
  const candidatesQuery = useParticipantCandidates(listingId, adding);
  const addParticipant = useAddParticipant(listingId);
  const candidates = candidatesQuery.data?.users ?? [];

  function handleAdd() {
    if (!selected) return;
    addParticipant.mutate(selected, {
      onSuccess: () => {
        setAdding(false);
        setSelected('');
      },
    });
  }

  return (
    <div className="chat-participants">
      <h3 className="chat-participants-title">{t('participants.title')}</h3>
      <ul className="chat-participants-list">
        {participants.map((p) => (
          <li key={p.id} className="chat-participants-item">
            {p.username}
          </li>
        ))}
      </ul>
      {closed ? null : adding ? (
        <div className="chat-participants-add">
          {candidates.length === 0 && !candidatesQuery.isLoading ? (
            <StatusDisplay variant="empty" message={t('participants.noCandidates')} />
          ) : (
            <>
              <label className="chat-participants-add-label">
                <span className="chat-participants-add-label-text">
                  {t('participants.addPlaceholder')}
                </span>
                <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">{t('participants.addPlaceholder')}</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.username}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selected || addParticipant.isPending}
              >
                {t('participants.addAction')}
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="chat-participants-add-toggle"
          onClick={() => setAdding(true)}
        >
          {t('participants.add')}
        </button>
      )}
    </div>
  );
}
