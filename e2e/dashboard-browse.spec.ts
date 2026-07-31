// TESTING.md §5.2: browse — landing → area → cluster → filters → deep-link
// reproduces the exact view in a fresh browser context. Runs against the
// seeded content fixtures (PVPDASH_SEED=1, playwright.config.ts). Every
// count below is computed directly from seed/fixtures/listings.json via
// packages/shared's own classifyListing (not hand-counted): in the immobili
// area, cluster 1 (Red Zone) has 1 principali / 3 fallimenti (id 1001 is a
// second, active Principali row, but its `data_vendita` of 2020-01-01 is
// deliberately always in the past — Phase 5's "Aggiorna alla data odierna"
// same-session rule (UI §9.2) moves it into the Archivio on every load, so it
// never appears in a live cluster count; see session-archive.spec.ts); cluster
// 2 (Blue Chip Zone) has 6 principali / 1 fallimenti (none of which have a
// past `data_vendita`), of which exactly 3 principali rows carry tribunale
// "Tribunale di Roma".
import { test, expect } from '@playwright/test';
import { loginAsAdmin, selectCluster } from './helpers.js';

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
    await expect(page.getByRole('tab', { name: 'Procedure principali 1' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fallimenti 3' })).toBeVisible();

    // Cluster 2 (Blue Chip Zone) — Phase 13: the cluster pill row became a
    // searchable combobox; the option's accessible name still carries the
    // area-local number plus the cluster name.
    await selectCluster(page, /2\s+Blue Chip Zone/);
    await expect(page.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Procedure principali 6' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fallimenti 1' })).toBeVisible();
    await expect(page.getByText('6 listing', { exact: true })).toBeVisible();

    // Filter: tribunale = Tribunale di Roma narrows 6 → 3.
    await page.getByLabel('Tribunale', { exact: true }).selectOption('Tribunale di Roma');
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
    await page.getByLabel('Tribunale', { exact: true }).selectOption('Tribunale di Roma');
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
    await expect(freshPage.getByLabel('Tribunale', { exact: true })).toHaveValue(
      'Tribunale di Roma',
    );
    await expect(freshPage.getByRole('columnheader', { name: /Valore richiesto/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await freshContext.close();
  });

  test('archivio shows the permanently archived rows plus the same-session past-sale move', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/aste/immobili?cluster=archivio');
    await expect(page.getByRole('heading', { name: 'Archivio' })).toBeVisible();
    // seed/fixtures/listings.json: ids 1050 and 1051 are permanently archived
    // (archived_at != null); id 1001 joins them via the same-session past-sale
    // rule (UI §9.2 — its data_vendita of 2020-01-01 is always in the past),
    // moved automatically on load. Full same-session flow: session-archive.spec.ts.
    await expect(page.getByText('3 listing', { exact: true })).toBeVisible();
  });
});
