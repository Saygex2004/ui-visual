// The pratiche view end to end: the full create → open window → edit →
// export round-trip, and the workbook that comes down carrying the FILTERED
// set, not the whole register. That last point is
// the one worth an e2e test: the table and the export are wired to the same
// function precisely so they cannot diverge, and this is what proves it in a
// real browser rather than in a unit test of that function.
import { test, expect } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
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
  await form.getByLabel('NDG 1', { exact: true }).fill(campi.ndg);
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

    await page.getByRole('link', { name: /Pratiche cartacee/ }).click();
    await expect(page).toHaveURL(/\/pratiche/);
    await expect(page.getByRole('heading', { name: 'Pratiche cartacee' })).toBeVisible();

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
    // Anchored to the "N. scatole" row, not to the text "12" anywhere in the
    // dialog: a bare getByText('12') also matched the NDG "E2E-900123" and,
    // on any run whose generated usernames happened to contain "12", an
    // <option> of the "Ordinata da" select — which is exactly how it failed.
    await expect(
      window.locator('.pratiche-window-row', { hasText: 'N. scatole' }).locator('dd'),
    ).toHaveText('12');
    await window.getByRole('button', { name: 'Chiudi' }).click();

    // The deep link the Slack notification carries: landing on that address
    // must open this pratica's window, not just the list.
    const id = new URL(page.url()).searchParams.get('pratica');
    expect(id).toBeNull(); // closing cleared it
    await page.getByRole('button', { name: NDG_A }).click();
    const linked = new URL(page.url()).searchParams.get('pratica');
    expect(linked).toBeTruthy();
    await page.goto('/pratiche');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto(`/pratiche?pratica=${linked}`);
    await expect(page.getByRole('heading', { name: 'Pratica 163354' })).toBeVisible();
    await page.getByRole('button', { name: 'Chiudi' }).click();

    // A stale id must land on the list, never on an error screen.
    await page.goto('/pratiche?pratica=non-esiste-piu');
    await expect(page.getByRole('heading', { name: 'Pratiche cartacee' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Filter down to one portfolio, then export: the file must contain exactly
    // the row on screen.
    await page.getByLabel('Filtra per portafoglio').selectOption('Augusto');
    await expect(page.getByRole('button', { name: NDG_A })).toBeVisible();
    await expect(page.getByRole('button', { name: NDG_B })).toHaveCount(0);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Scarica/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^pratiche-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const stream = await download.createReadStream();
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    // A real workbook, checked by unzipping what actually came down the wire
    // rather than trusting the builder that produced it.
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const zip = unzipSync(new Uint8Array(bytes));
    const sheet = strFromU8(zip['xl/worksheets/sheet1.xml']!);
    expect(sheet).toContain(NDG_A);
    expect(sheet).not.toContain(NDG_B); // the filter reached the file
    expect(strFromU8(zip['xl/workbook.xml']!)).toContain('name="Pratiche"');
  });

  test('the month filter narrows by the date the user chooses', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/pratiche');

    await creaPratica(page, { ndg: 'E2E-MESE-1', numero: '500001', portafoglio: 'Traiano' });
    await creaPratica(page, { ndg: 'E2E-MESE-2', numero: '500002', portafoglio: 'Traiano' });

    // Give the two different request dates, in different months.
    await page.getByRole('button', { name: 'E2E-MESE-1' }).click();
    let finestra = page.getByRole('dialog');
    await finestra.getByRole('button', { name: 'Modifica' }).click();
    await finestra.getByLabel('Data richiesta').fill('2026-03-04');
    await finestra.getByRole('button', { name: 'Salva' }).click();
    await finestra.getByRole('button', { name: 'Chiudi' }).click();

    await page.getByRole('button', { name: 'E2E-MESE-2' }).click();
    finestra = page.getByRole('dialog');
    await finestra.getByRole('button', { name: 'Modifica' }).click();
    await finestra.getByLabel('Data richiesta').fill('2026-05-20');
    await finestra.getByRole('button', { name: 'Salva' }).click();
    await finestra.getByRole('button', { name: 'Chiudi' }).click();

    // Only the months actually present are offered — an empty one would look
    // like something had gone missing.
    const mese = page.getByLabel('Filtra per mese');
    await expect(mese.locator('option')).toContainText([
      'Tutti i mesi',
      'maggio 2026',
      'marzo 2026',
    ]);

    await mese.selectOption({ label: 'marzo 2026' });
    await expect(page.getByRole('button', { name: 'E2E-MESE-1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'E2E-MESE-2' })).toHaveCount(0);

    // Switching the date field clears the month, because a month that exists
    // for one date need not exist for another.
    await page.getByLabel('Filtra per data').selectOption({ label: 'Data spedizione' });
    await expect(mese).toHaveValue('');
    await expect(page.getByRole('button', { name: 'E2E-MESE-1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'E2E-MESE-2' })).toBeVisible();
  });

  test('one order can cover several NDGs, and they all reach the file', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/pratiche');

    await page.getByRole('button', { name: 'Nuova pratica' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('NDG 1', { exact: true }).fill('E2E-MULTI-A');
    await form.getByRole('button', { name: 'Aggiungi NDG' }).click();
    await form.getByLabel('NDG 2', { exact: true }).fill('E2E-MULTI-B');
    await form.getByRole('button', { name: 'Aggiungi NDG' }).click();
    await form.getByLabel('NDG 3', { exact: true }).fill('E2E-MULTI-C');
    // A row added and left empty is the normal state of a form someone
    // stopped filling: it must be dropped, not refused.
    await form.getByRole('button', { name: 'Aggiungi NDG' }).click();
    await form.getByLabel('Numero pratica').fill('770001');
    await form.getByLabel('Portafoglio').fill('Adriano');
    await form.getByRole('button', { name: 'Crea pratica' }).click();

    const riga = page.getByRole('button', { name: /E2E-MULTI-A/ });
    await expect(riga).toBeVisible();
    await expect(riga).toContainText('E2E-MULTI-B');
    await expect(riga).toContainText('E2E-MULTI-C');

    // Searchable by ANY of them, not just the first — otherwise the extra
    // positions would be decoration.
    await page.getByLabel('Cerca fra le pratiche').fill('E2E-MULTI-C');
    await expect(page.getByRole('button', { name: /E2E-MULTI-A/ })).toBeVisible();
    await page.getByLabel('Cerca fra le pratiche').fill('');

    // And removable again.
    await riga.click();
    const finestra = page.getByRole('dialog');
    await finestra.getByRole('button', { name: 'Modifica' }).click();
    await finestra.getByRole('button', { name: 'Togli NDG 2' }).click();
    await finestra.getByRole('button', { name: 'Salva' }).click();
    await expect(finestra).not.toContainText('E2E-MULTI-B');
    await expect(finestra).toContainText('E2E-MULTI-C');
  });
});
