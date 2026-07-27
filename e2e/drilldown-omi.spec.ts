// TESTING.md §5: geographic drill-down + OMI price panel (UI §3.2/§3.3).
// Fixture facts used here (seed/fixtures/listings.json, hand-verified, not
// guessed), all within cluster 2 (Blue Chip Zone) so none is affected by the
// same-session archive rule (no Blue Chip row has a past `data_vendita`):
// Lazio's Principali rows are comune=Roma (ids 1004, 1030, 1040) and
// comune=Tivoli (id 1031, provincia=Roma) — selecting the Roma CAPITAL gives 3
// rows, selecting the Roma PROVINCE gives 4 (capital + Tivoli), a concrete
// demonstration that they are different filters. Roma's OMI doc is real
// (2.800–4.200, zona Centro Storico); Milano's is real too (3.500–6.500, zona
// Centro), reached the same way with a single capital=province row (id 1060 on
// this Principali tab; id 1003 is Milano too but Fallimenti).
//
// The "OMI not available" state is checked in cluster 1 (Red Zone) via
// Campania/Caserta (id 1032, no OMI doc at all). Campania's OTHER row (id
// 1001, comune=Napoli, whose OMI doc is error-marked) is deliberately
// excluded from this check: its `data_vendita` of 2020-01-01 is always in the
// past, so the same-session rule (UI §9.2) always moves it to the Archivio
// before this test's page even finishes loading — Napoli never appears as a
// drill-down option in a live cluster table (see session-archive.spec.ts for
// that row; the OMI error-doc case itself is unit-tested in
// packages/shared/src/domain/omi.test.ts, since UI never distinguishes it
// from the absent-doc case anyway, DATA_MODEL.md §4).
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('drill-down + OMI panel', () => {
  test('capital vs province give different counts; both show real OMI data', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/aste/immobili?cluster=2'); // Blue Chip Zone
    await expect(page.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();
    await expect(page.getByText('6 listing', { exact: true })).toBeVisible();

    await page.getByRole('radio', { name: 'Lazio', exact: true }).click();
    await expect(page.getByRole('radio', { name: /Roma \(capoluogo\)/ })).toBeVisible();

    // Capital: 3 rows (the comune=Roma ones only).
    await page.getByRole('radio', { name: /Roma \(capoluogo\)/ }).click();
    await expect(page.getByText('3 / 6 listing', { exact: true })).toBeVisible();
    await expect(page.getByText(/Prezzo di riferimento OMI/)).toBeVisible();
    await expect(page.getByText(/2\.?800/)).toBeVisible();
    await expect(page.getByText(/4\.?200/)).toBeVisible();
    await expect(page.getByText(/Centro Storico/)).toBeVisible();
    await expect(page.getByText(/residenziale/)).toBeVisible(); // the mandated caveat

    // Province: 4 rows (capital + Tivoli) — mutually exclusive with capital,
    // so picking it clears the capital chip back to unchecked.
    await page.getByLabel('Provincia').selectOption('Roma');
    await expect(page.getByText('4 / 6 listing', { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Roma \(capoluogo\)/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.getByText(/Prezzo di riferimento OMI/)).toBeVisible();

    // Changing region clears both capital and province, and hides the panel.
    await page.getByRole('radio', { name: 'Lombardia', exact: true }).click();
    await expect(page.getByLabel('Provincia')).toHaveValue('');
    await expect(page.getByText(/Prezzo di riferimento OMI/)).toHaveCount(0);

    // Milano (capital === province here, single row on this tab): also real data.
    await page.getByRole('radio', { name: /Milano \(capoluogo\)/ }).click();
    await expect(page.getByText('1 / 6 listing', { exact: true })).toBeVisible();
    await expect(page.getByText(/3\.?500/)).toBeVisible();
    await expect(page.getByText(/6\.?500/)).toBeVisible();
  });

  test('a province with no OMI doc at all shows the "not available" state', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/aste/immobili?cluster=1'); // Red Zone
    await expect(page.getByRole('heading', { name: /Cluster 1: Red Zone/ })).toBeVisible();

    await page.getByRole('radio', { name: 'Campania', exact: true }).click();
    // Only Caserta is present — Napoli (id 1001) already moved to the
    // Archivio via the automatic same-session rule before this page loaded.
    await expect(page.getByRole('radio', { name: /Caserta \(capoluogo\)/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Napoli/ })).toHaveCount(0);

    await page.getByLabel('Provincia').selectOption('Caserta');
    await expect(
      page.getByText('Dati OMI non disponibili per la provincia di Caserta.'),
    ).toBeVisible();

    // "Tutte le regioni" clears the geographic filter and hides the panel.
    await page.getByRole('radio', { name: 'Tutte le regioni' }).click();
    await expect(page.getByText(/Prezzo di riferimento OMI/)).toHaveCount(0);
  });
});
