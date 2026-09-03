// The Slack member id on one account.
//
// It is what makes a person mentionable at all: a pratica can only tag
// someone who has one, so this field is the gate in front of that whole
// feature. Saved on blur rather than on every keystroke — an id is pasted,
// not typed, and a request per character would be noise.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUser } from '@pvp/shared';
import { TextInput } from '../../components/TextInput.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { translateApiError } from '../../lib/translateApiError.js';
import { useSetSlackId } from './hooks.js';

export function SlackIdField({ user }: { user: AdminUser }) {
  const { t } = useTranslation('admin');
  const salva = useSetSlackId();
  const [valore, setValore] = useState(user.slack_id ?? '');
  const [errore, setErrore] = useState<string | null>(null);

  // Follows the server when the list refetches, so another admin's change
  // does not sit invisible behind a stale local copy.
  useEffect(() => {
    setValore(user.slack_id ?? '');
  }, [user.slack_id]);

  function salvaSeCambiato() {
    const pulito = valore.trim().toUpperCase();
    if (pulito === (user.slack_id ?? '')) return;
    setErrore(null);
    salva.mutate(
      { userId: user.id, slackId: pulito === '' ? null : pulito },
      {
        onError: (err) => {
          setErrore(translateApiError(t, err, t('slackId.saveError')));
          setValore(user.slack_id ?? ''); // il server resta la verita'
        },
      },
    );
  }

  return (
    <div className="admin-slack-id">
      <TextInput
        aria-label={t('slackId.label', { username: user.username })}
        placeholder={t('slackId.placeholder')}
        value={valore}
        disabled={salva.isPending}
        onChange={(e) => setValore(e.target.value)}
        onBlur={salvaSeCambiato}
      />
      {errore ? <StatusDisplay variant="error" message={errore} /> : null}
    </div>
  );
}
