// Shared across every spec file (TESTING.md §5): the one login helper, robust
// to which spec file happens to run first in the shared, single-worker run
// (auth-flow.spec.ts rotates the bootstrap admin's password as part of its
// own flow — every other file must tolerate either password being active).
import { expect, type Page } from '@playwright/test';
import { E2E_BOOTSTRAP_PASSWORD, ADMIN_ROTATED_PASSWORD } from '../playwright.config.js';

// --- Phase 13 (UX redesign) interaction helpers -----------------------------
// The cluster pill-row and the region chip-row became comboboxes, and the
// native alert()/confirm() flows became modal ConfirmDialogs. These wrap the
// two-step "open the listbox, pick the option" and "click, then confirm in
// the dialog" idioms so every spec drives them the same way.

/** Opens the user menu and clicks one of its items (Radix renders menu items
 *  only while the menu is open). */
export async function openUserMenuItem(
  page: Page,
  username: string,
  itemName: string,
): Promise<void> {
  await page.getByRole('button', { name: username }).click();
  await page.getByRole('menuitem', { name: itemName }).click();
}

/** Picks a cluster (or "Archivio") from the selector toolbar's combobox. */
export async function selectCluster(page: Page, optionName: RegExp | string): Promise<void> {
  await page.getByRole('combobox', { name: 'Cluster' }).click();
  await page.getByRole('option', { name: optionName }).click();
}

/** Picks a region (including "Tutte le regioni") from the region combobox. */
export async function selectRegion(page: Page, optionName: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Regione' }).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

/** Opens a table row's chat from the row's "⋯" overflow menu (Phase 13
 *  moved the per-row quick actions there). */
export async function openRowChat(page: Page, row: ReturnType<Page['locator']>): Promise<void> {
  await row.getByRole('button', { name: 'Altre azioni' }).click();
  await page.getByRole('menuitem', { name: 'Apri chat' }).click();
}

/** Clicks a control that opens a ConfirmDialog, asserts the dialog's copy,
 *  then resolves it. Returns the dialog's description text. */
export async function clickExpectingConfirm(
  page: Page,
  buttonName: string,
  action: 'Conferma' | 'OK' | 'Annulla',
): Promise<string> {
  await page.getByRole('button', { name: buttonName }).click();
  // Scoped by class, not by role: the workspace drawer and every popover are
  // `role="dialog"` too, so a bare role lookup is ambiguous whenever a
  // confirmation is raised from inside one of them.
  const dialog = page.locator('.ui-confirm');
  await expect(dialog).toBeVisible();
  const message = (await dialog.textContent()) ?? '';
  await dialog.getByRole('button', { name: action, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  return message;
}

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
