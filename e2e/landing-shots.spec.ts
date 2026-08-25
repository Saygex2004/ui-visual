// Landing card check: the three cards must all read clearly in BOTH themes.
// Exists because the pratiche card shipped with brand-fill on brand-strong,
// which in light mode is navy on navy — invisible, and no assertion anywhere
// would have said so.
import { test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

for (const theme of ['light', 'dark'] as const) {
  test(`landing — ${theme}`, async ({ page }) => {
    await loginAsAdmin(page);
    await page.evaluate((t) => localStorage.setItem('pvpdash.theme', t), theme);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `pratiche-shots/landing-${theme}.png`, fullPage: true });
  });
}
