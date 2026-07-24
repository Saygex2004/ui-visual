// TESTING.md §5.2: browse — landing → area → cluster → filters → deep-link
// reproduces the exact view in a fresh browser context. Runs against the
// seeded content fixtures (PVPDASH_SEED=1, playwright.config.ts). Every
// count below is computed directly from seed/fixtures/listings.json via
// packages/shared's own classifyListing (not hand-counted): in the immobili
// area, cluster 1 (Red Zone) has 2 principali / 3 fallimenti; cluster 2 (Blue
// Chip Zone) has 6 principali / 1 fallimenti, of which exactly 3 principali
// rows carry tribunale "Tribunale di Roma".
import { test, expect, type Page } from '@playwright/test';
import { E2E_BOOTSTRAP_PASSWORD, ADMIN_ROTATED_PASSWORD } from '../playwright.config.js';

/** Attaches a no-op catch to suppress the "unhandled rejection" warning from
 *  a losing `Promise.race` branch, without affecting what the race itself
 *  observes (a promise may carry multiple independent handlers). */
function quiet<T>(p: Promise<T>): Promise<T> {
  p.catch(() => {});
  return p;
}

/** The shared bootstrap admin (one bootstrap event per server boot, shared
 *  by every spec file in this run) may already have had its password
 *  rotated by auth-flow.spec.ts — tries the bootstrap password first and
 *  falls back to the rotated one, robust to spec-file execution order. */
async function loginAsAdmin(page: Page): Promise<void> {
  async function attempt(password: string): Promise<'invalid' | 'forced-change' | 'success'> {
    await page.goto('/login');
    await page.getByLabel('Nome utente').fill('admin');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entra' }).click();
    return Promise.race([
      quiet(
        page
          .getByText('Nome utente o password non corretti.')
          .waitFor({ state: 'visible' })
          .then(() => 'invalid' as const),
      ),
      quiet(
        page
          .getByRole('heading', { name: 'Imposta una nuova password' })
          .waitFor({ state: 'visible' })
          .then(() => 'forced-change' as const),
      ),
      quiet(
        page
          .getByRole('button', { name: 'admin' })
          .waitFor({ state: 'visible' })
          .then(() => 'success' as const),
      ),
    ]);
  }

  let outcome = await attempt(E2E_BOOTSTRAP_PASSWORD);
  let activePassword = E2E_BOOTSTRAP_PASSWORD;
  if (outcome === 'invalid') {
    outcome = await attempt(ADMIN_ROTATED_PASSWORD);
    activePassword = ADMIN_ROTATED_PASSWORD;
  }
  if (outcome === 'forced-change') {
    await page.getByLabel('Password attuale').fill(activePassword);
    await page.getByLabel('Nuova password', { exact: true }).fill(ADMIN_ROTATED_PASSWORD);
    await page.getByLabel('Conferma nuova password').fill(ADMIN_ROTATED_PASSWORD);
    await page.getByRole('button', { name: 'Salva e continua' }).click();
  }
  await expect(page.getByRole('button', { name: 'admin' })).toBeVisible();
}

test.describe('auth flow 2: browse, filter, deep-link', () => {
  test('landing → area → cluster → filter → deep-link reproduces the exact view', async ({
    page,
    context,
  }) => {
    await loginAsAdmin(page);

    // Landing.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Scegli una vista' })).toBeVisible();
    await page.getByRole('link', { name: /Cluster Immobiliari/ }).click();
    await expect(page).toHaveURL(/\/aste\/immobili/);

    // Default lands on cluster 1 (Red Zone) — exact fixture counts.
    await expect(page.getByRole('heading', { name: /Cluster 1: Red Zone/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Procedure principali 2' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fallimenti 3' })).toBeVisible();

    // Cluster 2 (Blue Chip Zone).
    await page.getByRole('tab', { name: /2\s+Blue Chip Zone/ }).click();
    await expect(page.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Procedure principali 6' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fallimenti 1' })).toBeVisible();
    await expect(page.getByText('6 listing', { exact: true })).toBeVisible();

    // Filter: tribunale = Tribunale di Roma narrows 6 → 3.
    await page.getByLabel('Tribunale').selectOption('Tribunale di Roma');
    await expect(page.getByText('3 / 6 listing', { exact: true })).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(4); // 3 data rows + header

    // Sort by Valore richiesto, descending on the second click.
    const sortButton = page.getByRole('button', { name: /Valore richiesto/ });
    await sortButton.click();
    await expect(page.getByRole('columnheader', { name: /Valore richiesto/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await sortButton.click();
    await expect(page.getByRole('columnheader', { name: /Valore richiesto/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    // Reset filtri clears the narrowed view back to 6 — but NOT the sort
    // (UI §4.2 lists search/column filters/range/blocco isolation only;
    // sort is deliberately untouched), so it's still valore/descending here.
    await page.getByRole('button', { name: 'Reset filtri' }).click();
    await expect(page.getByText('6 listing', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Valore richiesto/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    // Re-apply the filter to build a concrete deep link, then capture it.
    await page.getByLabel('Tribunale').selectOption('Tribunale di Roma');
    await expect(page.getByText('3 / 6 listing', { exact: true })).toBeVisible();
    const deepLink = page.url();
    expect(deepLink).toContain('cluster=2');
    expect(deepLink).toContain('sort=valore');

    // Open the exact same URL in a brand-new browser context (own cookie
    // jar), carrying only the auth session forward — this is the "fresh
    // context reproduces the exact view" requirement, not a same-tab reload.
    const authState = await context.storageState();
    const freshContext = await context.browser()!.newContext({ storageState: authState });
    const freshPage = await freshContext.newPage();
    await freshPage.goto(deepLink);

    await expect(
      freshPage.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ }),
    ).toBeVisible();
    await expect(freshPage.getByText('3 / 6 listing', { exact: true })).toBeVisible();
    await expect(freshPage.getByLabel('Tribunale')).toHaveValue('Tribunale di Roma');
    await expect(freshPage.getByRole('columnheader', { name: /Valore richiesto/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await freshContext.close();
  });

  test('archivio shows the permanently archived fixture rows', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/aste/immobili?cluster=archivio');
    await expect(page.getByRole('heading', { name: 'Archivio' })).toBeVisible();
    // seed/fixtures/listings.json: ids 1050 and 1051 are archived_at != null.
    await expect(page.getByText('2 listing', { exact: true })).toBeVisible();
  });
});
