// TESTING.md §5 flow 3 + §3 categories round-trip (UI §8.2). Fixture facts:
// seed/fixtures/settings.json's saved selection equals DEFAULT_CATEGORY_SELECTION
// exactly (including "FALL" — Fallimentare); fixture listing 1061 carries the
// invented out-of-catalog code "ZXQ9" specifically so the fail-open,
// non-uncheckable 5th group (DOMAIN_RULES.md Appendix A) is observable here.
// The PUT this test exercises is `modules/settings`'s write — the only Part A
// write in the codebase — and its admin_events entry is checked on the
// separate activity screen this phase also adds.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('admin: extraction categories + activity', () => {
  test('unrecognized group is visible; save round-trips a real change; activity screen shows the event and seeded runs', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Categorie di estrazione' }).click();
    await expect(page).toHaveURL(/\/admin\/categorie/);
    await expect(
      page.getByRole('heading', { name: 'Amministrazione — Categorie di estrazione' }),
    ).toBeVisible();

    // The two mandated statements (UI §8.2).
    await expect(page.getByText(/non abbrevia un aggiornamento/)).toBeVisible();
    await expect(page.getByText(/archiviati, non cancellati/)).toBeVisible();

    // The fail-open, non-uncheckable 5th group.
    await expect(page.getByText('Codici non riconosciuti (sempre mantenuti)')).toBeVisible();
    const zxq9 = page.getByRole('checkbox', { name: 'ZXQ9' });
    await expect(zxq9).toBeChecked();
    await expect(zxq9).toBeDisabled();

    // Round-trip: uncheck a real catalog entry, save, reload, confirm it
    // persisted — then restore it (other specs share this emulator instance).
    const fallCheckbox = page.getByRole('checkbox', { name: 'Fallimentare (FALL)' });
    await expect(fallCheckbox).toBeChecked();
    await fallCheckbox.uncheck();
    await page.getByRole('button', { name: 'Salva selezione' }).click();
    await expect(
      page.getByText('Selezione salvata: si applicherà al prossimo aggiornamento degli immobili.'),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Fallimentare (FALL)' })).not.toBeChecked();

    await page.getByRole('checkbox', { name: 'Fallimentare (FALL)' }).check();
    await page.getByRole('button', { name: 'Salva selezione' }).click();
    await expect(
      page.getByText('Selezione salvata: si applicherà al prossimo aggiornamento degli immobili.'),
    ).toBeVisible();

    // Activity screen: the categories_changed event (newest first) + runs.
    await page.goto('/admin/attivita');
    await expect(page.getByRole('heading', { name: 'Amministrazione — Attività' })).toBeVisible();
    const eventsTable = page.locator('.admin-table').nth(0);
    await expect(eventsTable.getByRole('row').nth(1)).toContainText(
      'Categorie di estrazione modificate',
    );

    const runsTable = page.locator('.admin-table').nth(1);
    await expect(runsTable.getByRole('row')).toHaveCount(3); // header + 2 seeded runs
  });
});
