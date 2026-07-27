// Shared across every spec file (TESTING.md §5): the one login helper, robust
// to which spec file happens to run first in the shared, single-worker run
// (auth-flow.spec.ts rotates the bootstrap admin's password as part of its
// own flow — every other file must tolerate either password being active).
import { expect, type Page } from '@playwright/test';
import { E2E_BOOTSTRAP_PASSWORD, ADMIN_ROTATED_PASSWORD } from '../playwright.config.js';

/** Attaches a no-op catch to suppress the "unhandled rejection" warning from
 *  a losing `Promise.race` branch, without affecting what the race itself
 *  observes (a promise may carry multiple independent handlers). */
function quiet<T>(p: Promise<T>): Promise<T> {
  p.catch(() => {});
  return p;
}

export async function loginAsAdmin(page: Page): Promise<void> {
  async function attempt(password: string): Promise<'invalid' | 'forced-change' | 'success'> {
    await page.goto('/login');
    await page.getByLabel('Nome utente').fill('admin');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entra' }).click();
    return Promise.race([
      quiet(
        page
          .getByText('Nome utente o password non corretti.')
          .waitFor({ state: 'visible' })
          .then(() => 'invalid' as const),
      ),
      quiet(
        page
          .getByRole('heading', { name: 'Imposta una nuova password' })
          .waitFor({ state: 'visible' })
          .then(() => 'forced-change' as const),
      ),
      quiet(
        page
          .getByRole('button', { name: 'admin' })
          .waitFor({ state: 'visible' })
          .then(() => 'success' as const),
      ),
    ]);
  }

  let outcome = await attempt(E2E_BOOTSTRAP_PASSWORD);
  let activePassword = E2E_BOOTSTRAP_PASSWORD;
  if (outcome === 'invalid') {
    outcome = await attempt(ADMIN_ROTATED_PASSWORD);
    activePassword = ADMIN_ROTATED_PASSWORD;
  }
  if (outcome === 'forced-change') {
    await page.getByLabel('Password attuale').fill(activePassword);
    await page.getByLabel('Nuova password', { exact: true }).fill(ADMIN_ROTATED_PASSWORD);
    await page.getByLabel('Conferma nuova password').fill(ADMIN_ROTATED_PASSWORD);
    await page.getByRole('button', { name: 'Salva e continua' }).click();
  }
  await expect(page.getByRole('button', { name: 'admin' })).toBeVisible();
}
