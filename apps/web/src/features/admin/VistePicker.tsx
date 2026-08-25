// Per-account view grants (UI §8.1). Checkboxes rather than a multi-select:
// there are three, they are all visible at once, and the state of each is
// readable without opening anything.
//
// Saved on toggle, not behind a Save button, so the row never shows a state
// the server does not hold.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VISTE, type AdminUser, type Vista } from '@pvp/shared';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import { useSetViste } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';

export function VistePicker({ user }: { user: AdminUser }) {
  const { t } = useTranslation('admin');
  const setViste = useSetViste();
  const [errore, setErrore] = useState<string | null>(null);

  function toggle(vista: Vista, checked: boolean) {
    setErrore(null);
    const viste = checked ? [...user.viste, vista] : user.viste.filter((v) => v !== vista);
    setViste.mutate(
      { userId: user.id, viste },
      { onError: (err) => setErrore(translateApiError(t, err, t('viste.saveError'))) },
    );
  }

  return (
    <div className="admin-viste">
      <span className="ui-micro-label">{t('viste.label')}</span>
      <div className="admin-viste-options">
        {VISTE.map((vista) => (
          <label key={vista} className="admin-viste-option">
            <input
              type="checkbox"
              checked={user.viste.includes(vista)}
              disabled={user.role === 'admin' || setViste.isPending}
              onChange={(e) => toggle(vista, e.target.checked)}
            />
            {t(`viste.nomi.${vista}`)}
          </label>
        ))}
      </div>
      {user.role === 'admin' ? (
        // Stated, not merely implied by the disabled boxes: otherwise an admin
        // looks like an account with no access at all.
        <p className="admin-viste-note">{t('viste.adminVedeTutto')}</p>
      ) : null}
      {user.viste.length === 0 && user.role !== 'admin' ? (
        <p className="admin-viste-note">{t('viste.nessuna')}</p>
      ) : null}
      {errore ? <StatusDisplay variant="error" message={errore} /> : null}
    </div>
  );
}
