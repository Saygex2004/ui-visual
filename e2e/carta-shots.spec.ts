// Screenshot pass for the letterhead view, in both themes. The page itself is
// deliberately unthemed white paper, so what these check is that the chrome
// around it still reads correctly at night — and that the page is not washed
// out against its surround.
import { test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

for (const theme of ['light', 'dark'] as const) {
  test(`carta — ${theme}`, async ({ page }) => {
    await loginAsAdmin(page);
    await page.evaluate((t) => localStorage.setItem('pvpdash.theme', t), theme);
    await page.goto('/carta');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `carta-shots/01-proposta-${theme}.png`, fullPage: true });

    // The heaviest form: acquisto crediti with an earn-out shows almost every
    // conditional section at once.
    await page.getByLabel('Tipo di documento').selectOption('acquisto');
    await page.getByLabel('Tipo di corrispettivo').selectOption('earnout');
    await page.screenshot({ path: `carta-shots/02-acquisto-${theme}.png`, fullPage: true });
  });
}
