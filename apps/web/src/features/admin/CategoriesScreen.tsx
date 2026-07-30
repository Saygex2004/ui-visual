// Administration — Extraction categories (UI §8.2). The four catalog groups
// (CATEGORY_GROUPS, for labels/order) rendered over the server's own
// `catalog` entries (never redefined locally) as grouped checkboxes, plus a
// checked, non-uncheckable 5th group for codes observed on real listings but
// absent from the catalog (DOMAIN_RULES.md Appendix A's fail-open rule). The
// PUT here is `modules/settings`'s write — THE ONLY PART A WRITE IN THE
// CODEBASE (DATA_MODEL.md §7).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button.js';
import { CATEGORY_GROUPS, type CategoryGroup } from '@pvp/shared';
import { useAdminCategories, useSaveCategories } from './hooks.js';
import { translateApiError } from '../../lib/translateApiError.js';
import './admin.css';

export function CategoriesScreen() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError } = useAdminCategories();
  const saveCategories = useSaveCategories();
  const [checked, setChecked] = useState<Set<string> | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Re-syncs from the loaded (or just-saved-and-refetched) selection. This
  // query never polls, so it only fires on mount and after a successful save
  // — never clobbers an in-progress, unsaved edit.
  useEffect(() => {
    if (data) setChecked(new Set(data.selection));
  }, [data]);

  function toggle(code: string) {
    setChecked((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSave() {
    if (!checked) return;
    setMessage(null);
    saveCategories.mutate([...checked], {
      onSuccess: () => setMessage({ kind: 'success', text: t('categories.saveSuccess') }),
      onError: (err) =>
        setMessage({
          kind: 'error',
          text: translateApiError(t, err, t('categories.saveGenericError')),
        }),
    });
  }

  return (
    <div className="admin-screen">
      <h1>{t('categories.title')}</h1>

      {isLoading ? <p>{t('categories.loading')}</p> : null}
      {isError ? (
        <p className="admin-message admin-message-error" role="alert">
          {t('categories.loadError')}
        </p>
      ) : null}

      {data && checked ? (
        <>
          <p className="admin-note">{t('categories.noteNoShorten')}</p>
          <p className="admin-note">{t('categories.noteArchivedNotDeleted')}</p>

          {data.is_default ? (
            <p className="admin-note admin-note-emphasis">{t('categories.defaultBadge')}</p>
          ) : (
            <p className="admin-note">
              {t('categories.updatedBy', {
                username: data.updated_by,
                date: data.updated_at ? new Date(data.updated_at).toLocaleString('it-IT') : '',
              })}
            </p>
          )}

          {CATEGORY_GROUPS.map((group: { key: CategoryGroup; label: string }) => (
            <fieldset key={group.key} className="admin-category-group">
              <legend>{t(`categories.group.${group.key}`)}</legend>
              {data.catalog
                .filter((entry) => entry.group === group.key)
                .map((entry) => (
                  <label key={entry.code} className="admin-category-option">
                    <input
                      type="checkbox"
                      checked={checked.has(entry.code)}
                      onChange={() => toggle(entry.code)}
                    />
                    {t('categories.entryLabel', { label: entry.label, code: entry.code })}
                  </label>
                ))}
            </fieldset>
          ))}

          {data.unrecognized_codes.length > 0 ? (
            <fieldset className="admin-category-group admin-category-group-unrecognized">
              <legend>{t('categories.unrecognizedGroupTitle')}</legend>
              <p className="admin-note">{t('categories.unrecognizedGroupNote')}</p>
              {data.unrecognized_codes.map((code) => (
                <label key={code} className="admin-category-option">
                  <input type="checkbox" checked disabled />
                  {code}
                </label>
              ))}
            </fieldset>
          ) : null}

          {message ? (
            <p
              className={`admin-message admin-message-${message.kind}`}
              role={message.kind === 'error' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          ) : null}

          <Button onClick={handleSave} disabled={saveCategories.isPending}>
            {t('categories.saveButton')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
