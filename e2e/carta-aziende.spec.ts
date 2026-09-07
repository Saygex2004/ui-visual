// Adding a company from the admin panel and then using it in a letter.
//
// The round-trip is the point: the API side is asserted directly in
// modules/carta/carta.integration.test.ts, and what only a browser can show
// is that a company added here actually turns up in the two menus that matter
// — the sender and the recipient auto-fill — and reaches the page.
import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const RUN_ID = Date.now();
const MITTENTE = `E2E Mittente ${RUN_ID} S.r.l.`;
const SOLO_DEST = `E2E Destinataria ${RUN_ID} S.p.A.`;

async function aggiungiAzienda(
  page: Page,
  nome: string,
  soloDestinatario: boolean,
  stampaNome = true,
) {
  await page.goto('/admin/aziende');
  await page.getByRole('button', { name: 'Aggiungi azienda' }).click();
  await page.getByLabel('Ragione sociale').fill(nome);
  await page.getByLabel('Indirizzo').fill('Via della Prova 10');
  await page.getByLabel('CAP').fill('20122');
  await page.getByLabel('Città', { exact: true }).fill('Milano');
  await page.getByLabel('PEC').fill('prova@legalmail.it');
  if (soloDestinatario) {
    await page.getByLabel('Utilizzabile come mittente').uncheck();
  }
  if (!stampaNome) {
    await page.getByLabel('Stampa il nome in cima al foglio').uncheck();
  }
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(page.getByText('Azienda salvata.')).toBeVisible();
}

test('a company added by an admin can write, and be written to', async ({ page }) => {
  await loginAsAdmin(page);

  await aggiungiAzienda(page, MITTENTE, false);
  await aggiungiAzienda(page, SOLO_DEST, true);

  await page.goto('/carta');

  // The sender menu offers the first but NOT the recipient-only one.
  const mittente = page.getByLabel('Società mittente');
  await expect(mittente.locator('option', { hasText: MITTENTE })).toHaveCount(1);
  await expect(mittente.locator('option', { hasText: SOLO_DEST })).toHaveCount(0);

  // The recipient auto-fill offers both — being written to is what the
  // second one was added for.
  const daAzienda = page.getByLabel('Compila da azienda');
  await expect(daAzienda.locator('option', { hasText: SOLO_DEST })).toHaveCount(1);

  await daAzienda.selectOption({ label: SOLO_DEST });
  await expect(page.getByLabel('Ragione sociale')).toHaveValue(SOLO_DEST);
  await expect(page.getByLabel('PEC')).toHaveValue('prova@legalmail.it');
  await expect(page.getByLabel('Città', { exact: true })).toHaveValue('Milano');

  // And it reaches the page, which is the only thing that ships.
  await expect(page.locator('.printable')).toContainText(SOLO_DEST);

  // Writing FROM the other one puts its name on the letterhead.
  await mittente.selectOption({ label: MITTENTE });
  await expect(page.locator('.printable')).toContainText(MITTENTE);
});

test('a company can be added with a bare head of page', async ({ page }) => {
  const SENZA_NOME = `E2E Muta ${RUN_ID} S.r.l.`;
  await loginAsAdmin(page);
  await aggiungiAzienda(page, SENZA_NOME, false, false);

  await page.goto('/carta');
  await page.getByLabel('Società mittente').selectOption({ label: SENZA_NOME });

  // The company is the sender — its footer and address are in use — but its
  // name is NOT printed across the top: that is the whole point of the
  // choice, and it is what a pre-printed sheet needs.
  const intestazione = page.locator('.printable').locator('div').first();
  await expect(intestazione).not.toContainText(SENZA_NOME);
});
