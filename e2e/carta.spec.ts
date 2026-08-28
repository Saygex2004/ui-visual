// The letterhead view's two pieces of behaviour that live in the browser and
// nowhere else: the recipient registry, and where the sheet sits.
//
// The document itself is covered by unit tests over the .docx bytes
// (features/carta/utils/docxGenerator.test.ts) — this file is deliberately
// only about what the form does, not about what comes out of it.
import { test, expect } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
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

  test('the amount is written out in words, and can be corrected by hand', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/carta');

    // Typing the figure fills its companion...
    await page.getByLabel('Importo (€)').fill('60000');
    const lettere = page.getByLabel('Importo in lettere');
    await expect(lettere).toHaveValue('sessantamila/00');
    await expect(lettere).toHaveAttribute('readonly', '');

    // ...and both reach the page, which is what actually ships. The words in
    // brackets after the figure are the point: they prevail if the two ever
    // disagree, which is why they cannot be left to a hint under an input.
    await expect(page.locator('.printable')).toContainText('Euro 60.000,00 (sessantamila/00)');

    // Changing the figure keeps them in step.
    await page.getByLabel('Importo (€)').fill('1250,50');
    await expect(lettere).toHaveValue('milleduecentocinquanta/50');

    // Taken over by hand, they stop following...
    await page.getByRole('button', { name: /scrivi a mano/ }).click();
    await lettere.fill('milleduecentocinquanta virgola cinquanta');
    await page.getByLabel('Importo (€)').fill('99');
    await expect(lettere).toHaveValue('milleduecentocinquanta virgola cinquanta');

    // ...and handed back, they are recomputed at once rather than left stale.
    await page.getByRole('button', { name: /automatico/ }).click();
    await expect(lettere).toHaveValue('novantanove/00');
  });

  test('the accettazione quotes a proposal read from a Word file', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/carta');
    await page.getByLabel('Tipo di documento').selectOption('accettazione');

    // A real .docx, built here rather than committed as a binary: bold, an
    // alignment, and the signature block the reader is meant to drop.
    const paragrafo = (testo: string, extra = '') =>
      `<w:p>${extra}<w:r><w:t xml:space="preserve">${testo}</w:t></w:r></w:p>`;
    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${paragrafo('Spettabile Duepuntozero, con la presente Vi proponiamo quanto segue.')}
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>CONDIZIONI ESSENZIALI</w:t></w:r></w:p>
${paragrafo('Il corrispettivo e\u0027 fissato in Euro 10.000,00.')}
${paragrafo('_________________________')}
${paragrafo('Mario Bianchi, amministratore')}
</w:body></w:document>`;
    const docx = zipSync({
      '[Content_Types].xml': strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
      ),
      '_rels/.rels': strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
      ),
      'word/document.xml': strToU8(document),
    });

    await page.setInputFiles('input[type="file"]', {
      name: 'proposta-ricevuta.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from(docx),
    });

    // The button reports the file landed, and the text reaches the letter.
    await expect(page.getByRole('button', { name: /clicca per cambiare/ })).toBeVisible();
    const foglio = page.locator('.printable');
    await expect(foglio).toContainText('Vi proponiamo quanto segue');
    await expect(foglio).toContainText('CONDIZIONI ESSENZIALI');

    // Formatting survives — reading the file this way rather than as plain
    // text is the whole reason the quotation looks like the original.
    const anteprima = page.locator('.carta-citazione-anteprima');
    await expect(anteprima.locator('strong')).toHaveText('CONDIZIONI ESSENZIALI');
    await expect(anteprima.locator('p').nth(1)).toHaveCSS('text-align', 'center');

    // The signature block at the end is dropped: quoting someone's signature
    // back at them inside the acceptance is not what the citation is for.
    await expect(anteprima).not.toContainText('Mario Bianchi');
    await expect(anteprima).not.toContainText('______');
  });

  test('the subject follows the document type, but never overwrites one written by hand', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/carta');

    // exact: the rinuncia has an "Importo oggetto di rinuncia" field, which a
    // substring match would pick up as well.
    const oggetto = page.getByLabel('Oggetto', { exact: true });
    await expect(oggetto).toHaveValue('Proposta di finanziamento');

    // The subject names the instrument, so it follows the type.
    await page.getByLabel('Tipo di documento').selectOption('acquisto');
    await expect(oggetto).toHaveValue('Offerta vincolante di acquisto di crediti pecuniari');
    await page.getByLabel('Tipo di documento').selectOption('rinuncia');
    await expect(oggetto).toHaveValue('Rinuncia a crediti');

    // Written by hand, it survives a change of type: the automatic subject is
    // a starting point, not something that reclaims the field.
    await oggetto.fill('Rinuncia parziale — pratica 4731512');
    await page.getByLabel('Tipo di documento').selectOption('proposta');
    await expect(oggetto).toHaveValue('Rinuncia parziale — pratica 4731512');
    await expect(page.locator('.printable')).toContainText('Rinuncia parziale — pratica 4731512');
  });

  test('the master servicer is picked from the list rather than typed', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/carta');
    await page.getByLabel('Tipo di documento').selectOption('acquisto');

    const servicer = page.getByLabel('Master servicer');
    await expect(servicer).toHaveValue('');
    await servicer.selectOption('Zenith Service S.p.A.');
    // It reaches the offer's own sentence about the securitisation.
    await expect(page.locator('.printable')).toContainText(
      'Zenith Service S.p.A. assumerà il ruolo di "master servicer"',
    );
  });

  test('the rinuncia can be signed by one person and declared by another', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/carta');
    await page.getByLabel('Tipo di documento').selectOption('rinuncia');

    // The letter above is signed by one person...
    await page.getByLabel('Nome firmatario').fill('Santo Logoteta');
    await page.getByLabel('Carica firmatario').fill('legale rappresentante');

    // ...and the declaration under art. 47 is made, and signed, by another.
    // Choosing them carries their gender, which decides the opening words.
    await page.getByLabel('Scegli chi dichiara').selectOption('Silvia Caviglia');
    await expect(page.getByLabel('Nome di chi dichiara')).toHaveValue('Silvia Caviglia');

    const foglio = page.locator('.printable');
    await expect(foglio).toContainText('Santo Logoteta');
    await expect(foglio).toContainText('La sottoscritta Silvia Caviglia');
    // The declaration's own signature block names her too, rather than
    // leaving an unattributed line under the company.
    await expect(foglio).toContainText('Amministratore Unico');

    // A man declaring it changes the opening, and nothing else.
    await page.getByLabel('Scegli chi dichiara').selectOption('Santo Logoteta');
    await expect(foglio).toContainText('Il sottoscritto Santo Logoteta');
  });

  test('an admin changes who may sign, and the drafting form follows', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/firmatari');

    // A woman, so the declaration's opening words have to change with her.
    await page.getByRole('button', { name: 'Aggiungi persona' }).click();
    const righe = page.locator('.admin-firmatario');
    const ultima = righe.last();
    await ultima.getByPlaceholder('Nome e cognome').fill('Giulia Neri');
    await ultima.getByPlaceholder('Carica').fill('Direttore generale');
    await ultima.getByRole('combobox').selectOption('F');

    await page.getByRole('button', { name: 'Aggiungi qualifica' }).click();
    await page.locator('.admin-qualifica input').last().fill('Direttore generale');
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await expect(page.getByText('Elenco aggiornato.')).toBeVisible();

    // The drafting form offers her, and choosing her sets the gendered
    // opening of the declaration — the reason the field exists at all.
    await page.goto('/carta');
    await page.getByLabel('Tipo di documento').selectOption('rinuncia');
    await page.getByLabel('Scegli chi dichiara').selectOption('Giulia Neri');
    await expect(page.getByLabel('Qualifica di chi dichiara')).toHaveValue('Direttore generale');
    await expect(page.locator('.printable')).toContainText('La sottoscritta Giulia Neri');

    // Put back, so this test does not decide who may sign for the next one.
    await page.goto('/admin/firmatari');
    await page.getByRole('button', { name: /Ripristina/ }).click();
    await page
      .getByRole('button', { name: /Ripristina/ })
      .last()
      .click();
    await expect(page.getByText('Ripristinato')).toBeVisible();
  });
});
