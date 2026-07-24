// TESTING.md §5 flow 1: bootstrap → admin creates a user → forced password
// change → sign-in lands on requested URL. Also covers: anonymous access is
// refused and redirected, and the session survives a page reload.
import { test, expect } from '@playwright/test';
import { E2E_BOOTSTRAP_PASSWORD, ADMIN_ROTATED_PASSWORD } from '../playwright.config.js';

const NEW_USERNAME = `nuovoutente-${Date.now()}`;
const NEW_TEMP_PASSWORD = 'TempPass123!';
const NEW_FINAL_PASSWORD = 'NuovoUtentePass1!';
const ADMIN_NEW_PASSWORD = ADMIN_ROTATED_PASSWORD;

test.describe.serial('auth flow 1: bootstrap, forced change, redirect-preserving sign-in', () => {
  test('anonymous access to a protected route redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin/);
  });

  test('bootstrap admin signs in, is forced to change password, then reaches /admin', async ({
    page,
  }) => {
    await page.goto('/login?redirect=%2Fadmin');
    await page.getByLabel('Nome utente').fill('admin');
    await page.getByLabel('Password', { exact: true }).fill(E2E_BOOTSTRAP_PASSWORD);
    await page.getByRole('button', { name: 'Entra' }).click();

    // Forced change gate — the bootstrap admin is created with
    // must_change_password: true (SPECIFICATIONS.md §7).
    await expect(page.getByRole('heading', { name: 'Imposta una nuova password' })).toBeVisible();
    await page.getByLabel('Password attuale').fill(E2E_BOOTSTRAP_PASSWORD);
    await page.getByLabel('Nuova password', { exact: true }).fill(ADMIN_NEW_PASSWORD);
    await page.getByLabel('Conferma nuova password').fill(ADMIN_NEW_PASSWORD);
    await page.getByRole('button', { name: 'Salva e continua' }).click();

    // Lands on the originally-requested URL — no extra navigation needed
    // because the URL was already /admin, only masked by the gate.
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Amministrazione — Account' })).toBeVisible();
  });

  test('the admin creates a new account', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Nome utente').fill('admin');
    await page.getByLabel('Password', { exact: true }).fill(ADMIN_NEW_PASSWORD);
    await page.getByRole('button', { name: 'Entra' }).click();
    // SPA navigation (not page.goto), so the click naturally waits out the
    // login mutation instead of racing it with a hard reload.
    await page.getByRole('button', { name: 'admin' }).click();
    await page.getByRole('menuitem', { name: 'Amministrazione' }).click();

    await page.getByLabel('Nome utente').fill(NEW_USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(NEW_TEMP_PASSWORD);
    await page.getByRole('button', { name: 'Crea account' }).click();

    await expect(page.getByText(`Account "${NEW_USERNAME}" creato.`)).toBeVisible();
    await expect(page.getByRole('cell', { name: NEW_USERNAME })).toBeVisible();

    // Sign out so the next test starts anonymous.
    await page.getByRole('button', { name: 'admin' }).click();
    await page.getByRole('menuitem', { name: 'Esci' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('the new account is forced to change its password, then lands on the requested URL', async ({
    page,
  }) => {
    // A non-admin route: the new user has role "user" and must reach it
    // without tripping the /admin role guard.
    await page.goto('/calendario');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcalendario/);

    await page.getByLabel('Nome utente').fill(NEW_USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(NEW_TEMP_PASSWORD);
    await page.getByRole('button', { name: 'Entra' }).click();

    await expect(page.getByRole('heading', { name: 'Imposta una nuova password' })).toBeVisible();
    await page.getByLabel('Password attuale').fill(NEW_TEMP_PASSWORD);
    await page.getByLabel('Nuova password', { exact: true }).fill(NEW_FINAL_PASSWORD);
    await page.getByLabel('Conferma nuova password').fill(NEW_FINAL_PASSWORD);
    await page.getByRole('button', { name: 'Salva e continua' }).click();

    await expect(page).toHaveURL(/\/calendario$/);
    // The Amministrazione menu item must not be offered to a non-admin.
    await page.getByRole('button', { name: NEW_USERNAME }).click();
    await expect(page.getByRole('menuitem', { name: 'Amministrazione' })).toHaveCount(0);
  });

  test('the session survives a page reload', async ({ page }) => {
    await page.goto('/calendario');
    await page.getByLabel('Nome utente').fill(NEW_USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(NEW_FINAL_PASSWORD);
    await page.getByRole('button', { name: 'Entra' }).click();
    await expect(page).toHaveURL(/\/calendario$/);

    await page.reload();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(page.getByRole('button', { name: NEW_USERNAME })).toBeVisible();
  });
});
