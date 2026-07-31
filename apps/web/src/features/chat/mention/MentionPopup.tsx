// The mention picker popup (Execution Plan Phase 13, UI §6.2): rendered by
// the composer above the editor while an @-suggestion is active. Colleagues
// not yet in the thread carry an "Aggiungi" tag — picking them both inserts
// the mention and adds them as participants (mentionExtension.ts).
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../components/Avatar.js';
import { Badge } from '../../../components/Badge.js';
import { mentionOptionId, type MentionCandidate, type MentionState } from './mentionExtension.js';

export interface MentionPopupProps {
  state: MentionState;
  onPick: (item: MentionCandidate) => void;
  /** Shared with `RichTextEditor`, which points the editable surface's
   *  `aria-activedescendant` at `mentionOptionId(listboxId, activeIndex)` —
   *  this is the one place the two files must agree on the id scheme. */
  listboxId: string;
}

export function MentionPopup({ state, onPick, listboxId }: MentionPopupProps) {
  const { t } = useTranslation('chat');
  return (
    <div
      id={listboxId}
      className="chat-mention-popup"
      role="listbox"
      aria-label={t('mention.title')}
    >
      <span className="ui-micro-label chat-mention-popup-title">{t('mention.title')}</span>
      {state.items.length === 0 ? (
        <span className="chat-mention-empty">{t('mention.empty')}</span>
      ) : (
        state.items.map((item, index) => (
          <div
            key={item.id}
            id={mentionOptionId(listboxId, index)}
            role="option"
            aria-selected={index === state.activeIndex}
            className={`chat-mention-item${index === state.activeIndex ? ' chat-mention-item-active' : ''}`}
            // mousedown, not click: the editor keeps focus and the suggestion
            // range stays valid while the command runs.
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
          >
            <Avatar name={item.username} size="md" />
            <span className="chat-mention-item-name">{item.username}</span>
            {!item.isParticipant ? <Badge variant="success">{t('mention.addTag')}</Badge> : null}
          </div>
        ))
      )}
    </div>
  );
}
