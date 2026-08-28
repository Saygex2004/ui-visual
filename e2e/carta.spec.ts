// The letterhead view's two pieces of behaviour that live in the browser and
// nowhere else: the recipient registry, and where the sheet sits.
//
// The document itself is covered by unit tests over the .docx bytes
// (features/carta/utils/docxGenerator.test.ts) — this file is deliberately
// only about what the form does, not about what comes out of it.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('carta intestata', () => {
  test('the recipient can be filled from the company registry', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/carta');

    const mittente = page.getByLabel('Società mittente');
    await expect(mittente).toHaveValue('dpz-spa'); // the default sender

    const menu = page.getByLabel('Compila da azienda');
    const nomi = await menu.locator('option').allTextContents();

    // The sender is not offered as its own recipient, and neither is the
    // blank sheet, which carries no address to copy.
    expect(nomi).not.toContain('Duepuntozero S.p.A.');
    expect(nomi).not.toContain('Template Vuoto');
    expect(nomi).toContain('Duepuntozero NPL S.p.A.');

    await menu.selectOption({ label: 'Duepuntozero NPL S.p.A.' });

    // All six fields land together — a half-filled recipient is not a state
    // the form is allowed to reach.
    await expect(page.getByLabel('Ragione sociale')).toHaveValue('Duepuntozero NPL S.p.A.');
    await expect(page.getByLabel('Indirizzo')).toHaveValue('Corso Monforte, 15');
    await expect(page.getByLabel('CAP')).toHaveValue('20122');
    await expect(page.getByLabel('Città')).toHaveValue('Milano');
    await expect(page.getByLabel('PEC')).toHaveValue('duepuntozeronpl@legalmail.it');

    // The menu empties again: it is an action, not a record of the choice.
    // The fields below are the record, and they stay editable — a letter
    // often goes to a branch, or to a slightly different name.
    await expect(menu).toHaveValue('');
    await page.getByLabel('Ragione sociale').fill('Duepuntozero NPL S.p.A. — sede di Roma');

    // What was picked reaches the page, which is the only thing that ships.
    await expect(page.locator('.printable')).toContainText('Corso Monforte, 15');
    await expect(page.locator('.printable')).toContainText('sede di Roma');
  });

  test('the sheet is centred in its panel', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await loginAsAdmin(page);
    await page.goto('/carta');

    const panel = (await page.locator('.carta-preview').boundingBox())!;
    const sheet = (await page.locator('.carta-preview .printable').boundingBox())!;
    const sinistra = sheet.x - panel.x;
    const destra = panel.x + panel.width - (sheet.x + sheet.width);
    expect(Math.abs(sinistra - destra)).toBeLessThan(12);

    // And at a zoom wide enough to overflow, the LEFT edge of the sheet must
    // still be reachable: centring that pushes content out of the scroll area
    // is the standard way this breaks, so it is pinned here.
    for (let i = 0; i < 6; i++) await page.getByLabel('Ingrandisci anteprima').click();
    const largo = (await page.locator('.carta-preview .printable').boundingBox())!;
    const panelLargo = (await page.locator('.carta-preview').boundingBox())!;
    expect(largo.x).toBeGreaterThanOrEqual(panelLargo.x - 1);
  });
});
