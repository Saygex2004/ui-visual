// TESTING.md §5: blocco isolate + cross-cluster jump (UI §4.4). Fixture facts
// (seed/fixtures/listings.json, hand-verified): the "Tribunale di Roma 77/2022"
// proceeding has 5 active lots (ids 1030/1031 in Blue Chip Zone — Roma and
// Tivoli comuni respectively — plus one each in Red/Grey/Black Zone), all
// Principali (LG). The "Tribunale di Bari 55/2023" proceeding has 2 active
// lots (ids 1020/1021, both in Red Zone only, both Fallimenti/FALL) — a
// single-cluster block, so its badge carries no jump control at all.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('blocco isolate + cross-cluster jump', () => {
  test('isolating the 5-lot Roma block, then jumping via the chooser, lands isolated on the right cluster/tab', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/aste/immobili?cluster=2'); // Blue Chip Zone, Principali (default)
    await expect(page.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();

    const romaRow = page
      .locator('tr.data-table-body-row', { hasText: '77/2022' })
      .filter({ hasText: 'Roma (Roma)' });
    await expect(romaRow).toHaveCount(1);
    const badge = romaRow.getByRole('button', { name: '5', exact: true });
    await expect(badge).toBeVisible();

    // Isolate: exactly the block's 2 blue_chip lots remain (Roma + Tivoli).
    await badge.click();
    await expect(page.getByText('2 / 6 listing', { exact: true })).toBeVisible();
    await expect(page.locator('tr.data-table-body-row')).toHaveCount(2);
    await expect(badge).toHaveAttribute('aria-pressed', 'true');

    // Toggling the same badge again clears the isolation.
    await badge.click();
    await expect(page.getByText('6 listing', { exact: true })).toBeVisible();

    // Re-isolate, then use the jump control — 3 other clusters (Red/Grey/
    // Black), so it must open a chooser rather than jumping directly.
    await badge.click();
    await expect(page.getByText('2 / 6 listing', { exact: true })).toBeVisible();
    const jumpControl = romaRow.getByRole('button', {
      name: 'Il blocco continua in altri cluster',
    });
    await jumpControl.click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveCount(3);
    await expect(menu.getByRole('menuitem', { name: /Red Zone/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Grey Zone/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Black Zone/ })).toBeVisible();

    await menu.getByRole('menuitem', { name: /Grey Zone/ }).click();

    // Landed on Grey Zone, Principali tab, isolated to this block's one lot
    // there (id 1033, Isernia) — out of the cluster's 3 Principali rows.
    await expect(page.getByRole('heading', { name: /Cluster 4: Grey Zone/ })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Procedure principali/, selected: true }),
    ).toBeVisible();
    await expect(page.getByText('1 / 3 listing', { exact: true })).toBeVisible();
    await expect(page.locator('tr.data-table-body-row', { hasText: 'Isernia' })).toBeVisible();
  });

  test('the 2-lot Bari block (single cluster) shows no jump control', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/aste/immobili?cluster=1&tab=fallimenti'); // Red Zone, Fallimenti
    await expect(page.getByRole('heading', { name: /Cluster 1: Red Zone/ })).toBeVisible();

    const bariRow = page
      .locator('tr.data-table-body-row', { hasText: '55/2023' })
      .filter({ hasText: 'Bari (Bari)' });
    await expect(bariRow).toHaveCount(1);
    await expect(bariRow.getByRole('button', { name: '2', exact: true })).toBeVisible();
    await expect(
      bariRow.getByRole('button', { name: 'Il blocco continua in altri cluster' }),
    ).toHaveCount(0);
    await expect(bariRow.getByRole('button', { name: /Vai al blocco in/ })).toHaveCount(0);
  });
});
