// Screenshot pass for the pratiche view — light and dark. Not an assertion
// suite: it exists so the view is actually looked at before shipping, in both
// themes, rather than declared done from a green test run.
import { test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const SHOTS = 'pratiche-shots';

for (const theme of ['light', 'dark'] as const) {
  test(`pratiche — ${theme}`, async ({ page }) => {
    await loginAsAdmin(page);
    // The app reads this key before first paint (see index.html's bootstrap),
    // so setting it and reloading is what a real theme choice looks like.
    await page.evaluate((t) => localStorage.setItem('pvpdash.theme', t), theme);
    await page.goto('/pratiche');
    await page.waitForLoadState('networkidle');

    const dialog = page.getByRole('dialog');
    for (const p of [
      // NDGs carry the theme: both runs share one emulator, and a repeated
      // NDG would make the row lookup match two buttons.
      { ndg: `SHOT-${theme}-900123`, numero: '163354', portafoglio: 'Augusto', scatole: '3' },
      { ndg: `SHOT-${theme}-777999`, numero: '888111', portafoglio: 'Diocleziano', scatole: '12' },
    ]) {
      await page.getByRole('button', { name: 'Nuova pratica' }).click();
      await dialog.getByLabel('NDG').fill(p.ndg);
      await dialog.getByLabel('Numero pratica').fill(p.numero);
      await dialog.getByLabel('Portafoglio').fill(p.portafoglio);
      await dialog.getByLabel('N. scatole').fill(p.scatole);
      await dialog.getByLabel('Note e riferimenti').fill('Corrispondenza relativa alla pratica');
      await dialog.getByRole('button', { name: 'Crea pratica' }).click();
      await page.getByRole('button', { name: p.ndg }).waitFor();
    }

    await page.screenshot({ path: `${SHOTS}/01-elenco-${theme}.png`, fullPage: true });

    await page.getByRole('button', { name: `SHOT-${theme}-900123` }).click();
    await dialog.waitFor();
    await page.screenshot({ path: `${SHOTS}/02-finestra-${theme}.png` });

    await dialog.getByRole('button', { name: 'Modifica' }).click();
    await page.screenshot({ path: `${SHOTS}/03-modifica-${theme}.png` });
  });
}
