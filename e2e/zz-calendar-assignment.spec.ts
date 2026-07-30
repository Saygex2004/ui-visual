// TESTING.md §5 flow 4: calendar — first open of today assigns diversified
// listings; reopen returns the identical set; a rating advances progress;
// admin assigns by id including a corporate listing.
//
// Deliberately named to sort LAST among the e2e spec files (`zz-` prefix,
// not alphabetical luck): the seed fixture has only ~24-26 immobili listings
// actually eligible for automatic assignment, and the engine draws up to 18
// of them — meaning almost every listing, including 1055 (Pisa) and 1031
// (Tivoli), has a high chance of being swept into today's auto-assignment,
// each time appending a `calendar_assigned` event to that listing's
// `listing_activity` timeline. `ratings-collaboration.spec.ts` and
// `chat-collaboration.spec.ts` both assert an EXACT event count on those two
// listings' own Storico tabs — the same class of cross-file collision Phase
// 7 hit once already (see HANDOFF_PHASE_7.md), this time on the file-
// ordering axis rather than the listing axis, since which listings get
// auto-drawn can't be pinned to specific ids the way a manual test's target
// row can. Running this file last means every other file's exact-count
// assertion has already run and passed before today's calendar activity
// exists at all.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const RATING_LABEL = 'Ottimo affare';

test.describe('calendar assignment', () => {
  test('first open of today assigns diversified immobili; reopening is identical; a rating advances progress', async ({
    page,
  }) => {
    test.setTimeout(60_000); // includes one full calendarDay poll wait (~20-25s)
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'admin' }).click();
    await page.getByRole('menuitem', { name: /Calendario/ }).click();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(page.locator('.calendar-grid')).toBeVisible();

    await page.locator('.calendar-day-cell[data-today]').click();
    await expect(page).toHaveURL(/\/calendario\/\d{4}-\d{2}-\d{2}$/);

    const rows = page.locator('tr.data-table-body-row');
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(18);

    // Admin sees the internal ID as the first column (UI §7.2, admin-only).
    async function readIds(): Promise<string[]> {
      const count = await rows.count();
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        ids.push((await rows.nth(i).locator('td').first().textContent()) ?? '');
      }
      return ids;
    }

    const idsBefore = await readIds();

    await page.reload();
    await expect(rows).toHaveCount(rowCount);
    const idsAfterReload = await readIds();
    // Same set, same order — frozen, not re-drawn (UI §7.3).
    expect(idsAfterReload).toEqual(idsBefore);

    const progressBefore = await page.locator('.calendar-day-progress').textContent();
    expect(progressBefore).toMatch(/^0 di/);

    await rows.first().getByRole('button', { name: RATING_LABEL }).click();
    await expect(rows.first()).toHaveAttribute('data-rating', 'ottimo_affare');

    // The progress line comes from useDay's own poll (POLL_CADENCES_MS.calendarDay,
    // ~20s) — not invalidated by the rating mutation, same eventually-consistent
    // pattern ratings-collaboration.spec.ts already waits out elsewhere.
    await expect(page.locator('.calendar-day-progress')).toHaveText(/^1 di/, { timeout: 25_000 });
  });

  test('admin assigns a corporate listing by id, which routes correctly from the day it lands on', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const assignDate = '2027-03-15'; // far outside any other spec's dates

    await page.goto('/admin/calendario');
    await page.getByRole('tab', { name: 'Assegnazione per ID' }).click();

    await page.getByLabel('Cerca').fill('2001');
    // "🔍 Cerca" — Operazione BELLEZZA prefixed every action button's copy
    // with an emoji; the accessible name changed deliberately, not a bug.
    await page.getByRole('button', { name: '🔍 Cerca', exact: true }).click();

    const resultRow = page.locator('tbody tr', { hasText: '2001' });
    await expect(resultRow).toHaveCount(1);
    await expect(resultRow).toContainText('Crediti');
    await resultRow.getByRole('checkbox').check();

    await page.getByLabel('Utente').selectOption({ label: 'admin' });
    await page.getByLabel('Giorno').fill(assignDate);
    await page.getByRole('button', { name: 'Assegna selezionati' }).click();
    await expect(page.getByText('1 annunci assegnati.')).toBeVisible();

    await page.goto(`/calendario/${assignDate}`);
    const row = page.locator('tr.data-table-body-row', { hasText: '2001' });
    await expect(row).toHaveCount(1);

    await row.getByRole('link', { name: 'Scheda' }).click();
    await expect(page).toHaveURL(/\/aste\/crediti\/lotto\/2001/);
  });
});
