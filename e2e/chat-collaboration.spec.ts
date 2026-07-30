// TESTING.md §5: chat collaboration (UI §6) — rich text, attachments, and
// cross-user unread counters through three real actors. Target: listing 1031
// (immobili/blue_chip/cluster 2/principali — Tivoli (Roma)), deliberately NOT
// 1055 (Pisa, ratings-collaboration.spec.ts's own row): that test asserts an
// EXACT `.workspace-timeline-item` count on 1055's own Storico tab, and
// thread_opened/attachment_added/thread_closed/thread_reopened all land in
// the same shared per-listing `listing_activity` timeline chat writes to —
// confirmed by running the full suite once and watching ratings-collaboration
// fail with 6 items instead of 2. 1031 is untouched by every other e2e file
// (verified directly against a real booted snapshot, not assumed) — the other
// 5 cluster-2/principali rows are either 1055 itself or share a comune with
// another spec's own row lookup (Roma ×3 — blocco-jump's target cluster and
// dashboard-browse's tribunale filter both key off "Roma"; Milano — reused,
// coincidentally, by session-archive's unrelated archivio row). `PVPDASH_SEED=1`'s
// seedContent() never loads chat_threads.json (same exclusion as
// ratings.json/listing_activity.json — see seed/lib.ts), so every listing
// starts with no thread in e2e regardless of what integration tests'
// fixtures say. Poll cadences (constants/cadences.ts): unread ~20s
// (dashboard/menu badges), openThread ~7.5s (an already-open thread picking
// up a peer's message or a close/reopen).
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const RUN_ID = Date.now();
const USERNAME_B = `collega-b-${RUN_ID}`;
const USERNAME_C = `collega-c-${RUN_ID}`;
const TEMP_PASSWORD = 'TempCollab123!';
const FINAL_PASSWORD_B = 'CollabPassB1!';
const FINAL_PASSWORD_C = 'CollabPassC1!';
const LISTING_URL = '/aste/immobili?cluster=2';
const ROW_MATCH = 'Tivoli (Roma)';
const LISTING_ID = '1031';

// Smallest valid PNG (1×1, transparent) — a real, decodable image so the
// attachment preview `<img>` genuinely renders, not just an inert buffer.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function createAccount(page: import('@playwright/test').Page, username: string) {
  await page.getByLabel('Nome utente').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(TEMP_PASSWORD);
  await page.getByRole('button', { name: 'Crea account' }).click();
  await expect(page.getByText(`Account "${username}" creato.`)).toBeVisible();
}

async function loginAsNewUser(
  page: import('@playwright/test').Page,
  username: string,
  finalPassword: string,
) {
  await page.goto('/login');
  await page.getByLabel('Nome utente').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(TEMP_PASSWORD);
  await page.getByRole('button', { name: 'Entra' }).click();
  await expect(page.getByRole('heading', { name: 'Imposta una nuova password' })).toBeVisible();
  await page.getByLabel('Password attuale').fill(TEMP_PASSWORD);
  await page.getByLabel('Nuova password', { exact: true }).fill(finalPassword);
  await page.getByLabel('Conferma nuova password').fill(finalPassword);
  await page.getByRole('button', { name: 'Salva e continua' }).click();
  await page.goto(LISTING_URL);
  await expect(page.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();
}

test.describe('chat collaboration', () => {
  test('rich text + attachment reach three participants with correct unread badges, and close/reopen restore compose for everyone', async ({
    page,
    context,
  }) => {
    // Up to 5 poll-bound waits (badge-appears ×2, badge-clears, close/reopen
    // propagation ×2) plus two account-creation/login flows and a multipart
    // upload — generous budget, mirroring ratings-collaboration's
    // one-cycle-per-assertion approach.
    test.setTimeout(300_000);

    // --- Setup: admin creates two colleagues up front. ---
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'admin' }).click();
    await page.getByRole('menuitem', { name: 'Amministrazione' }).click();
    await createAccount(page, USERNAME_B);
    await createAccount(page, USERNAME_C);

    // B and C each get their own browser context (own cookie jar) and land
    // on the same table admin will act on, watching for the badge to appear.
    const bContext = await context.browser()!.newContext();
    const bPage = await bContext.newPage();
    await loginAsNewUser(bPage, USERNAME_B, FINAL_PASSWORD_B);
    const bRow = bPage.locator('tr.data-table-body-row', { hasText: ROW_MATCH });
    await expect(bRow).toHaveCount(1);

    const cContext = await context.browser()!.newContext();
    const cPage = await cContext.newPage();
    await loginAsNewUser(cPage, USERNAME_C, FINAL_PASSWORD_C);
    const cRow = cPage.locator('tr.data-table-body-row', { hasText: ROW_MATCH });
    await expect(cRow).toHaveCount(1);

    // --- Admin opens the thread via the row's quick action (UI §6.1) —
    // opening = becoming a participant, no prior thread required. ---
    await page.goto(LISTING_URL);
    await expect(page.getByRole('heading', { name: /Cluster 2: Blue Chip Zone/ })).toBeVisible();
    const aRow = page.locator('tr.data-table-body-row', { hasText: ROW_MATCH });
    await aRow.getByRole('link', { name: 'Chat' }).click();
    await expect(page.locator('.chat-composer')).toBeVisible();
    await expect(page.locator('.chat-participants-item')).toHaveCount(1);
    await expect(page.locator('.chat-participants-item').first()).toHaveText('admin');
    await expect(
      page.getByText('Nessun messaggio: scrivi il primo per avviare la conversazione.'),
    ).toBeVisible();

    // --- Compose: plain text + bold + a plain-typed URL (server-side
    // linkified, never through the link button) + a bullet list, plus an
    // image attached ahead of send (API_CONTRACT.md §6). ---
    const editor = page.locator('.chat-editor-content [contenteditable="true"]');
    await editor.click();
    await page.keyboard.type('Guarda questo lotto: ');
    await page.getByRole('button', { name: 'Grassetto' }).click();
    await page.keyboard.type('urgente');
    await page.getByRole('button', { name: 'Grassetto' }).click();
    await page.keyboard.type(' Dettagli: https://example.com/lotto-1031');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Elenco puntato' }).click();
    await page.keyboard.type('Prima cosa da fare');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Seconda cosa da fare');

    const fileInput = page.locator('.chat-composer input[type="file"]');
    await fileInput.setInputFiles({
      name: 'lotto-foto.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });
    await expect(page.getByText('lotto-foto.png')).toBeVisible();

    await page.getByRole('button', { name: 'Invia' }).click();
    await expect(page.locator('.chat-composer-pending')).toHaveCount(0);

    const firstMessage = page.locator('.chat-message').first();
    await expect(firstMessage.locator('strong', { hasText: 'urgente' })).toBeVisible();
    await expect(
      firstMessage.getByRole('link', { name: 'https://example.com/lotto-1031' }),
    ).toHaveAttribute('href', 'https://example.com/lotto-1031');
    await expect(firstMessage.locator('ul li')).toHaveCount(2);
    await expect(firstMessage.locator('ul li').nth(0)).toHaveText('Prima cosa da fare');
    await expect(firstMessage.locator('ul li').nth(1)).toHaveText('Seconda cosa da fare');
    await expect(firstMessage.locator('img.chat-attachment-preview')).toBeVisible();
    await expect(firstMessage.getByText(/lotto-foto\.png/)).toBeVisible();

    // --- Admin adds B — the whole prior history becomes B's unread (Fase 7
    // plan's "Scoperta chiave 3"). Own view updates instantly (mutation cache
    // patch); B's badge takes up to one unread poll (~20s). ---
    await page.getByRole('button', { name: 'Aggiungi un collega' }).click();
    await page.getByLabel('Scegli un collega…').selectOption({ label: USERNAME_B });
    // "➕ Aggiungi" — Operazione BELLEZZA prefixed every action button's copy
    // with an emoji; the accessible name changed deliberately, not a bug.
    await page.getByRole('button', { name: '➕ Aggiungi', exact: true }).click();
    await expect(page.locator('.chat-participants-item')).toHaveCount(2);

    await expect(bRow.locator('.data-table-chat-badge')).toHaveText('1', { timeout: 25_000 });

    // B opens via the row's own quick action, sees the rendered message +
    // attachment preview, and replies.
    await bRow.getByRole('link', { name: 'Chat' }).click();
    const bFirstMessage = bPage.locator('.chat-message').first();
    await expect(bFirstMessage.locator('strong', { hasText: 'urgente' })).toBeVisible();
    await expect(bFirstMessage.locator('img.chat-attachment-preview')).toBeVisible();
    await expect(bFirstMessage.locator('a.chat-attachment-download')).toHaveAttribute('href', /.+/);

    const bEditor = bPage.locator('.chat-editor-content [contenteditable="true"]');
    await bEditor.click();
    await bPage.keyboard.type('Perfetto, grazie mille!');
    await bPage.getByRole('button', { name: 'Invia' }).click();
    await expect(bPage.locator('.chat-message')).toHaveCount(2);

    // The badge clears on the dashboard once B's own next poll picks up the
    // just-marked-read state (opening itself was an immediate GET; the row's
    // badge is a separately-polled query — see AreaView's useMyThreadsMap).
    await bPage.goto(LISTING_URL);
    await expect(bRow.locator('.data-table-chat-badge')).toHaveCount(0, { timeout: 25_000 });

    // Back into the thread — needed for the close/reopen propagation checks
    // further down (leaving the dashboard above unmounts the workspace).
    await bRow.getByRole('link', { name: 'Chat' }).click();
    await expect(bPage.locator('.chat-composer')).toBeVisible();

    // --- Admin adds C — now TWO prior messages (admin's + B's reply) must
    // both land as C's unread, proving "full history", not just "since
    // added". ---
    await page.getByRole('button', { name: 'Aggiungi un collega' }).click();
    await page.getByLabel('Scegli un collega…').selectOption({ label: USERNAME_C });
    // "➕ Aggiungi" — Operazione BELLEZZA prefixed every action button's copy
    // with an emoji; the accessible name changed deliberately, not a bug.
    await page.getByRole('button', { name: '➕ Aggiungi', exact: true }).click();
    await expect(page.locator('.chat-participants-item')).toHaveCount(3);

    await expect(cRow.locator('.data-table-chat-badge')).toHaveText('2', { timeout: 25_000 });

    await cRow.getByRole('link', { name: 'Chat' }).click();
    await expect(cPage.locator('.chat-message')).toHaveCount(2);
    await expect(cPage.locator('.chat-participants-item')).toHaveCount(3);

    // --- Admin closes the thread (client-side confirm dialog, UI §6.2). ---
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Chiudi chat' }).click();
    await expect(page.locator('.chat-composer')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Aggiungi un collega' })).toHaveCount(0);
    await expect(page.locator('.chat-closed-notice')).toBeVisible();

    // B's already-open thread picks up the close within one openThread poll
    // (~7.5s) — still able to read the history and the attachment link.
    await expect(bPage.locator('.chat-composer')).toHaveCount(0, { timeout: 15_000 });
    await expect(bPage.locator('.chat-closed-notice')).toBeVisible();
    await expect(bFirstMessage.locator('a.chat-attachment-download')).toHaveAttribute('href', /.+/);

    // --- Admin reopens — restored instantly for admin, within a poll for B. ---
    await page.getByRole('button', { name: 'Riapri chat' }).click();
    await expect(page.locator('.chat-composer')).toBeVisible();
    await expect(bPage.locator('.chat-composer')).toBeVisible({ timeout: 15_000 });

    await bContext.close();
    await cContext.close();
  });

  test('a malicious message body is stored sanitized, and disallowed/oversized uploads are rejected', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page);

    // Open (join-or-create) the thread directly through the API — no editor
    // involved, since this test's whole point is bypassing it.
    const openRes = await page.request.get(`/api/chats/${LISTING_ID}`);
    expect(openRes.ok()).toBeTruthy();

    // A link mark with a disallowed scheme, and an entirely disallowed node
    // type — both are valid per RichTextNodeSchema's permissive `type:
    // z.string()` (SPECIFICATIONS.md §11 restricts by allowlist, not by the
    // wire schema), so this really does reach the server's sanitizer.
    const maliciousDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'link pericoloso',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'testo che deve sparire' }],
            },
          ],
        },
      ],
    };
    const sendRes = await page.request.post(`/api/chats/${LISTING_ID}/messages`, {
      data: { body: maliciousDoc, attachment_ids: [] },
    });
    expect(sendRes.ok()).toBeTruthy();
    const sendJson = await sendRes.json();
    const storedBody = JSON.stringify(sendJson.message.body);
    expect(storedBody).not.toContain('javascript:');
    expect(storedBody).not.toContain('heading');
    expect(storedBody).not.toContain('testo che deve sparire');
    expect(storedBody).toContain('link pericoloso');

    // The renderer confirms the same thing visually: plain text survives,
    // never as a clickable link, and the disallowed node's text is gone.
    await page.goto(`/chat/${LISTING_ID}`);
    await expect(page.getByText('link pericoloso')).toBeVisible();
    await expect(page.locator('a', { hasText: 'link pericoloso' })).toHaveCount(0);
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    await expect(page.getByText('testo che deve sparire')).toHaveCount(0);

    // Disallowed type (PVPDASH_ATTACH_TYPES doesn't include text/plain) —
    // rejected before ever appearing in the pending-attachments list.
    const fileInput = page.locator('.chat-composer input[type="file"]');
    await fileInput.setInputFiles({
      name: 'note.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(page.getByText('Questo tipo di file non è consentito.')).toBeVisible();
    await expect(page.locator('.chat-composer-pending')).toHaveCount(0);

    // Oversized (> PVPDASH_ATTACH_MAX_MB, default 10) but an allowed type —
    // isolates the size check from the type check.
    const oversized = Buffer.alloc(11 * 1024 * 1024, 1);
    await fileInput.setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: oversized });
    await expect(page.getByText('Il file è troppo grande.')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.chat-composer-pending')).toHaveCount(0);
  });
});
