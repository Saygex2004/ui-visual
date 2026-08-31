// The view switches, as the person on the receiving end experiences them.
//
// The API-side enforcement is asserted directly in
// modules/admin/admin.integration.test.ts (a closed view answers 403 even to
// an account that holds it). What is checked here is the part only a browser
// can show: that a colleague sees "closed for work" rather than a card that
// silently disappeared, and that a typed address does not leave them on a
// screen full of errors.
import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, openUserMenuItem } from './helpers.js';

const RUN_ID = Date.now();
const USERNAME = `collega-viste-${RUN_ID}`;
const TEMP_PASSWORD = 'TempViste123!';
const FINAL_PASSWORD = 'VistePass123!';

async function impostaStato(page: Page, stato: string, vista = 'Pratiche cartacee') {
  await page.goto('/admin');
  // Scoped to the switches: the view's name also labels a checkbox on every
  // account row below, which is exactly the confusion the two blocks are
  // arranged to avoid — a page-wide lookup would walk straight into it.
  const switches = page.locator('.admin-stati-viste');
  await switches.getByLabel(vista).selectOption({ label: stato });
}

test('a view closed for work says so, instead of vanishing', async ({ page, context }) => {
  await loginAsAdmin(page);

  await openUserMenuItem(page, 'admin', 'Amministrazione');
  await page.getByLabel('Nome utente').fill(USERNAME);
  await page.getByLabel('Password', { exact: true }).fill(TEMP_PASSWORD);
  await page.getByRole('button', { name: 'Crea account' }).click();
  await expect(page.getByText(`Account "${USERNAME}" creato.`)).toBeVisible();

  const riga = page.locator('tr', { hasText: USERNAME });
  await riga.getByRole('checkbox', { name: 'Pratiche cartacee' }).click();
  await expect(riga.getByRole('checkbox', { name: 'Pratiche cartacee' })).toBeChecked();

  const bContext = await context.browser()!.newContext();
  const bPage = await bContext.newPage();
  await bPage.goto('/login');
  await bPage.getByLabel('Nome utente').fill(USERNAME);
  await bPage.getByLabel('Password', { exact: true }).fill(TEMP_PASSWORD);
  await bPage.getByRole('button', { name: 'Entra' }).click();
  await bPage.getByLabel('Password attuale').fill(TEMP_PASSWORD);
  await bPage.getByLabel('Nuova password', { exact: true }).fill(FINAL_PASSWORD);
  await bPage.getByLabel('Conferma nuova password').fill(FINAL_PASSWORD);
  await bPage.getByRole('button', { name: 'Salva e continua' }).click();

  // Granted and open: an ordinary card that opens.
  await expect(bPage.getByRole('link', { name: /Pratiche cartacee/ })).toBeVisible();

  await impostaStato(page, 'In lavorazione');

  // The colleague reloads: the card is still there and still named, but it no
  // longer opens and says why. A card that had simply gone would have read as
  // a permission taken away.
  await bPage.goto('/');
  await expect(bPage.getByText('In lavorazione')).toBeVisible();
  await expect(bPage.getByText(/Temporaneamente non disponibile/)).toBeVisible();
  await expect(bPage.getByRole('link', { name: /Pratiche cartacee/ })).toHaveCount(0);

  // And the address typed by hand lands home, not on a broken screen.
  await bPage.goto('/pratiche');
  await expect(bPage).toHaveURL(/\/$|\/#/);

  // Reserved to admins instead: not theirs, so nothing is announced at all.
  await impostaStato(page, 'Solo admin');
  await bPage.goto('/');
  await expect(bPage.getByText('In lavorazione')).toHaveCount(0);
  await expect(bPage.getByText(/Pratiche cartacee/)).toHaveCount(0);

  // The admin is never shut out — of the view, or of the switch that reopens it.
  await expect(page.getByRole('link', { name: /Pratiche cartacee/ })).toHaveCount(0);
  await page.goto('/pratiche');
  await expect(page.getByRole('heading', { name: 'Pratiche cartacee' })).toBeVisible();

  // Reopened, the grant is exactly as it was — it was never touched.
  await impostaStato(page, 'Attivo');
  await bPage.goto('/');
  await expect(bPage.getByRole('link', { name: /Pratiche cartacee/ })).toBeVisible();

  await bContext.close();
});

test("the badge on each card says what that view's state actually is", async ({ page }) => {
  await loginAsAdmin(page);

  const tessera = (nome: string) => page.locator('.landing-option', { hasText: nome }).first();
  await expect(tessera('Cluster Immobiliari')).toContainText('Attiva');

  // Two switches in a row, deliberately: each change sends the WHOLE map, and
  // the second used to build its map from a query that had not refetched —
  // writing the second view's state over a document that no longer mentioned
  // the first. So the pair is the test, not one switch twice.
  await impostaStato(page, 'In lavorazione', 'Cluster Immobiliari');
  await impostaStato(page, 'Solo admin', 'Pratiche cartacee');

  await page.goto('/');
  await expect(tessera('Cluster Immobiliari')).toContainText('In lavorazione');
  await expect(tessera('Pratiche cartacee')).toContainText('Solo admin');
  // The one left alone is untouched — the point of the bug above.
  await expect(tessera('Cluster Crediti')).toContainText('Attiva');

  // Back to open, and the badges follow.
  await impostaStato(page, 'Attivo', 'Cluster Immobiliari');
  await impostaStato(page, 'Attivo', 'Pratiche cartacee');
  await page.goto('/');
  await expect(tessera('Cluster Immobiliari')).toContainText('Attiva');
  await expect(tessera('Pratiche cartacee')).toContainText('Attiva');
});
