// Participant bar (UI §6.2, redesigned in Execution Plan Phase 13): the
// avatar stack + count, and a "+ Aggiungi" search popover replacing the old
// select-then-confirm flow (one click to open, one to add — repeatable
// without closing; already-added colleagues show a check). Any participant
// may add one — not just admins, unlike close/reopen; the add control is
// hidden once the thread is closed. The candidate fetch stays lazy (only
// once the popover actually opens), same as before.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Plus } from 'lucide-react';
import type { UserRef } from '@pvp/shared';
import { useAddParticipant, useParticipantCandidates } from './hooks.js';
import { Avatar, AvatarStack } from '../../components/Avatar.js';
import { Button } from '../../components/Button.js';
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../../components/Popover.js';

export interface ParticipantListProps {
  listingId: string;
  participants: readonly UserRef[];
  closed: boolean;
}

export function ParticipantList({ listingId, participants, closed }: ParticipantListProps) {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const candidatesQuery = useParticipantCandidates(listingId, open);
  const addParticipant = useAddParticipant(listingId);
  const candidates = candidatesQuery.data?.users ?? [];

  const q = query.trim().toLowerCase();
  const rows = [
    ...participants.map((p) => ({ id: p.id, username: p.username, added: true })),
    ...candidates.map((c) => ({ id: c.id, username: c.username, added: false })),
  ].filter((row) => !q || row.username.toLowerCase().includes(q));

  return (
    <div className="chat-participants">
      <AvatarStack className="chat-participants-stack">
        {participants.map((p) => (
          <Avatar key={p.id} name={p.username} size="md" title={p.username} />
        ))}
      </AvatarStack>
      <span className="chat-participants-count">
        {t('participants.count', { count: participants.length })}
      </span>
      {closed ? null : (
        <PopoverRoot
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setQuery('');
          }}
        >
          <PopoverTrigger asChild>
            <Button severity="tinted" size="small" className="chat-participants-add-toggle">
              <Plus aria-hidden="true" size={14} />
              {t('participants.add')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="chat-participants-popover">
            <input
              type="text"
              className="ui-search-select-input"
              value={query}
              placeholder={t('participants.searchPlaceholder')}
              aria-label={t('participants.searchPlaceholder')}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="chat-participants-candidates">
              {candidates.length === 0 && !candidatesQuery.isLoading && q.length === 0 ? (
                <span className="chat-participants-nocandidates">
                  {t('participants.noCandidates')}
                </span>
              ) : null}
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="chat-participants-item"
                  disabled={row.added || addParticipant.isPending}
                  onClick={() => addParticipant.mutate(row.id)}
                >
                  <Avatar name={row.username} size="md" />
                  <span className="chat-participants-item-name">{row.username}</span>
                  {row.added ? (
                    <Check aria-hidden="true" size={14} className="chat-participants-item-check" />
                  ) : null}
                </button>
              ))}
            </div>
          </PopoverContent>
        </PopoverRoot>
      )}
    </div>
  );
}
