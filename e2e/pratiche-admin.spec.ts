// The pratiche view end to end: the landing card is admin-only, the full
// create → open window → edit → export round-trip works, and the CSV that
// comes down is the FILTERED set, not the whole register. That last point is
// the one worth an e2e test: the table and the export are wired to the same
// function precisely so they cannot diverge, and this is what proves it in a
// real browser rather than in a unit test of that function.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const NDG_A = 'E2E-900123';
const NDG_B = 'E2E-777999';

async function creaPratica(
  page: import('@playwright/test').Page,
  campi: { ndg: string; numero: string; portafoglio: string; scatole?: string },
) {
  await page.getByRole('button', { name: 'Nuova pratica' }).click();
  // Scoped to the dialog: the screen behind it has its own filter controls,
  // and a page-wide lookup would be reaching across two unrelated forms.
  const form = page.getByRole('dialog');
  await form.getByLabel('NDG').fill(campi.ndg);
  await form.getByLabel('Numero pratica').fill(campi.numero);
  await form.getByLabel('Portafoglio').fill(campi.portafoglio);
  if (campi.scatole) await form.getByLabel('N. scatole').fill(campi.scatole);
  await form.getByRole('button', { name: 'Crea pratica' }).click();
  await expect(page.getByRole('button', { name: campi.ndg })).toBeVisible();
}

test.describe('admin: pratiche', () => {
  // The non-admin case is deliberately NOT here: e2e has no non-admin login
  // helper, and the boundary that matters is the API's, which
  // modules/pratiche/pratiche.integration.test.ts asserts directly (403 on
  // every route, reads included). Hiding the card is presentation on top.

  test('create, open the window, edit, and export only the filtered rows', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: /Pratiche/ }).click();
    await expect(page).toHaveURL(/\/pratiche/);
    await expect(page.getByRole('heading', { name: 'Pratiche' })).toBeVisible();

    await creaPratica(page, { ndg: NDG_A, numero: '163354', portafoglio: 'Augusto', scatole: '3' });
    await creaPratica(page, { ndg: NDG_B, numero: '888111', portafoglio: 'Diocleziano' });

    // The window: opens on the NDG, shows the record, and can edit in place.
    await page.getByRole('button', { name: NDG_A }).click();
    const window = page.getByRole('dialog');
    await expect(window.getByRole('heading', { name: 'Pratica 163354' })).toBeVisible();
    await expect(window.getByText('Augusto')).toBeVisible();

    await window.getByRole('button', { name: 'Modifica' }).click();
    await window.getByLabel('N. scatole').fill('12');
    await window.getByRole('button', { name: 'Salva' }).click();
    await expect(window.getByText('12')).toBeVisible();
    await window.getByRole('button', { name: 'Chiudi' }).click();

    // Filter down to one vehicle, then export: the file must contain exactly
    // the row on screen.
    await page.getByLabel('Filtra per portafoglio').selectOption('Augusto');
    await expect(page.getByRole('button', { name: NDG_A })).toBeVisible();
    await expect(page.getByRole('button', { name: NDG_B })).toHaveCount(0);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Scarica/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^pratiche-\d{4}-\d{2}-\d{2}\.csv$/);

    const stream = await download.createReadStream();
    const csv = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    });

    expect(csv).toContain(NDG_A);
    expect(csv).not.toContain(NDG_B); // the filter reached the file
    expect(csv.charCodeAt(0)).toBe(0xfeff); // Excel reads the accents
    expect(csv.split('\r\n')[0]).toContain('NDG;Numero pratica;Portafoglio;Stato');
  });
});
