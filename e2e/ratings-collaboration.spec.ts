// TESTING.md §5: ratings collaboration — two independent actors (admin +
// a fresh account, created at runtime through the same admin-create-account
// flow auth-flow.spec.ts proves, not reusing its unexported username) see
// each other's Valutazione changes within one ratings poll cycle
// (POLL_CADENCES_MS.ratings, ~20s), and the workspace's Storico tab
// attributes both events to the right actor. Target: listing 1055
// (immobili/blue_chip/cluster 2/principali — Toscana/Pisa, unique comune
// among the fixtures, so a `hasText: 'Pisa (Pisa)'` row lookup is
// unambiguous). Confirmed unrated: e2e boots via PVPDASH_SEED=1 →
// seedContent() (seed/lib.ts), which deliberately never loads
// ratings.json/listing_activity.json — only seedAll() (integration tests)
// does.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const NEW_USERNAME = `collaboratore-${Date.now()}`;
const NEW_TEMP_PASSWORD = 'TempCollab123!';
const NEW_FINAL_PASSWORD = 'CollabPass1!';
const LISTING_URL = '/aste/immobili?cluster=2';
const RATING_LABEL = 'Ottimo affare';

test.describe('ratings collaboration', () => {
  test('two actors see each other rating changes within a poll cycle, attributed correctly in the workspace history', async ({
    page,
    context,
  }) => {
    // Two full poll cycles (set + clear) plus account setup overhead.
    test.setTimeout(120_000);

    // Actor A (admin) signs in and creates actor B's account.
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'admin' }).click();
    await page.getByRole('menuitem', { name: 'Amministrazione' }).click();
    await page.getByLabel('Nome utente').fill(NEW_USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(NEW_TEMP_PASSWORD);
    await page.getByRole('button', { name: 'Crea account' }).click();
    await expect(page.getByText(`Account "${NEW_USERNAME}" creato.`)).toBeVisible();

    // Actor B: own browser context (own cookie jar), signs in, completes the
    // forced password change, then watches the same table A will act on.
    const bContext = await context.browser()!.newContext();
    const bPage = await bContext.newPage();
    await bPage.goto('/login');
    await bPage.getByLabel('Nome utente').fill(NEW_USERNAME);
    await bPage.getByLabel('Password', { exact: true }).fill(NEW_TEMP_PASSWORD);
    await bPage.getByRole('button', { name: 'Entra' }).click();
    await expect(bPage.getByRole('heading', { name: 'Imposta una nuova password' })).toBeVisible();
    await bPage.getByLabel('Password attuale').fill(NEW_TEMP_PASSWORD);
    await bPage.getByLabel('Nuova password', { exact: true }).fill(NEW_FINAL_PASSWORD);
    await bPage.getByLabel('Conferma nuova password').fill(NEW_FINAL_PASSWORD);
    await bPage.getByRole('button', { name: 'Salva e continua' }).click();

    await bPage.goto(LISTING_URL);
    await expect(bPage.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();
    const bRow = bPage.locator('tr.data-table-body-row', { hasText: 'Pisa (Pisa)' });
    await expect(bRow).toHaveCount(1);
    await expect(bRow).not.toHaveAttribute('data-rating');

    // A opens the same table and rates the listing.
    await page.goto(LISTING_URL);
    await expect(page.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();
    const aRow = page.locator('tr.data-table-body-row', { hasText: 'Pisa (Pisa)' });
    await aRow.getByRole('button', { name: RATING_LABEL }).click();
    await expect(aRow).toHaveAttribute('data-rating', 'ottimo_affare');

    // B sees the row marked within one poll cycle — an auto-retrying
    // assertion against the live DOM, never a fixed wait.
    await expect(bRow).toHaveAttribute('data-rating', 'ottimo_affare', { timeout: 25_000 });

    // B clears it by clicking the now-active option.
    await bRow.getByRole('button', { name: RATING_LABEL }).click();
    await expect(bRow).not.toHaveAttribute('data-rating');

    // A sees the row unmarked within a poll.
    await expect(aRow).not.toHaveAttribute('data-rating', { timeout: 25_000 });

    // The workspace's Storico tab shows both events, newest first (server
    // order, DATA_MODEL.md §12), each attributed to the actor who caused it.
    await aRow.getByRole('link', { name: 'Scheda' }).click();
    await page.getByRole('tab', { name: 'Storico' }).click();

    const timelineItems = page.locator('.workspace-timeline-item');
    await expect(timelineItems).toHaveCount(2);
    await expect(timelineItems.nth(0)).toContainText(NEW_USERNAME);
    // "👍 Ottimo affare" — Operazione BELLEZZA prefixed every rating value's
    // copy with an emoji; the interpolated timeline text changed deliberately,
    // not a bug.
    await expect(timelineItems.nth(0)).toContainText(
      'ha rimosso la valutazione (👍 Ottimo affare)',
    );
    await expect(timelineItems.nth(1)).toContainText('admin');
    await expect(timelineItems.nth(1)).toContainText('ha valutato: 👍 Ottimo affare');

    await bContext.close();
  });
});
