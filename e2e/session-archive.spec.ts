// TESTING.md §5 flow 5: same-session past-sale handling (UI §9.2/§9.3,
// DOMAIN_RULES.md §11). Fixture facts (seed/fixtures/listings.json,
// hand-verified): id 1001 (Campania/Napoli, valore 250.000) is ACTIVE but its
// data_vendita of 2020-01-01 is always in the past, so it moves to the
// Archivio automatically on load. The permanent archive already holds id 1050
// (Campania/Napoli too, but valore 200.000 — distinguished from 1001 by
// price) and id 1051 (Lombardia/Milano). SPECIFICATIONS.md §14: the API has
// no operation to delete/hide/edit a listing, so this whole flow — the
// automatic move, "Aggiorna alla data odierna", and "Svuota archivio" — must
// never write to Firestore; asserted directly via the admin SDK against the
// emulator (FIRESTORE_EMULATOR_HOST is already in the Playwright process's
// env, set by `firebase emulators:exec` before it spawns `playwright test`).
import { test, expect } from '@playwright/test';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { connectDb } from '../seed/lib.js';
import { clickExpectingConfirm, loginAsAdmin } from './helpers.js';

function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toMillis();
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = normalize(v);
    return out;
  }
  return value;
}

async function snapshotListings(db: Firestore): Promise<Record<string, unknown>> {
  const snap = await db.collection('listings').get();
  const out: Record<string, unknown> = {};
  for (const doc of snap.docs) out[doc.id] = normalize(doc.data());
  return out;
}

test.describe('same-session past-sale handling', () => {
  test('auto-moves on load, Aggiorna reports counts, Svuota clears only the session move, and Firestore listings is byte-identical throughout', async ({
    page,
  }) => {
    const db = connectDb(process.env.PVPDASH_FIRESTORE_PROJECT_ID ?? 'demo-pvp-dashboard');

    await loginAsAdmin(page);
    await page.goto('/aste/immobili?cluster=archivio');
    await expect(page.getByRole('heading', { name: 'Archivio' })).toBeVisible();

    const before = await snapshotListings(db);

    // 2 permanent (1050, 1051) + 1 same-session move (1001), already applied
    // on load — no click needed for the move itself.
    await expect(page.getByText('3 listing', { exact: true })).toBeVisible();
    const movedRow = page
      .locator('tr.data-table-body-row', { hasText: 'Napoli' })
      .filter({ hasText: /250\.?000/ });
    const permanentNapoli = page
      .locator('tr.data-table-body-row', { hasText: 'Napoli' })
      .filter({ hasText: /200\.?000/ });
    const permanentMilano = page.locator('tr.data-table-body-row', { hasText: 'Milano' });
    await expect(movedRow).toBeVisible();
    await expect(permanentNapoli).toBeVisible();
    await expect(permanentMilano).toBeVisible();

    // Aggiorna: nothing new has crossed the threshold since load (same
    // calendar day) — reports 0 moved this click, 3 as the running total.
    // Phase 13: the native alert()/confirm() flows became ConfirmDialogs.
    const refreshMsg = await clickExpectingConfirm(page, 'Aggiorna alla data odierna', 'OK');
    expect(refreshMsg).toContain('0');
    expect(refreshMsg).toContain('3');
    await expect(page.getByText('3 listing', { exact: true })).toBeVisible();

    // Svuota: guarded, states the count, removes only the session move.
    const confirmMsg = await clickExpectingConfirm(page, 'Svuota archivio', 'Conferma');
    expect(confirmMsg).toContain('1');

    await expect(page.getByText('2 listing', { exact: true })).toBeVisible();
    await expect(movedRow).toHaveCount(0);
    await expect(permanentNapoli).toBeVisible(); // permanently archived rows untouched
    await expect(permanentMilano).toBeVisible();

    // Svuota again: nothing left to clear.
    const nothingMsg = await clickExpectingConfirm(page, 'Svuota archivio', 'OK');
    expect(nothingMsg).toContain('scomparsi');
    await expect(page.getByText('2 listing', { exact: true })).toBeVisible();

    const after = await snapshotListings(db);
    expect(after).toEqual(before);
  });
});
