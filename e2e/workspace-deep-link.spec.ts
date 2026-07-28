// TESTING.md §5: a cold deep link to /aste/:area/lotto/:id?pannello=storico
// opens the workspace already on the Storico tab (not the dettagli default),
// and both ways of closing it (Escape, the dedicated close button) navigate
// back to /aste/:area preserving `cluster` and dropping `pannello`
// (FRONTEND.md §2). Listing 1003 (immobili/blue_chip/cluster 2/fallimenti,
// Lombardia/Milano) — a different fixture than ratings-collaboration.spec.ts
// uses, so this file has no dependency on that one's rating mutations or on
// spec execution order.
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

const DEEP_LINK = '/aste/immobili/lotto/1003?cluster=2&pannello=storico';

test.describe('workspace deep link', () => {
  test('opens on the Storico tab from a cold load; Escape and the close button both return to the area, preserving cluster and dropping pannello', async ({
    page,
    context,
  }) => {
    await loginAsAdmin(page);
    // A brand-new context (own cookie jar, no prior SPA navigation) carrying
    // only the auth session forward — the same "fresh context reproduces the
    // exact view" idiom dashboard-browse.spec.ts uses for its own deep link.
    const authState = await context.storageState();
    const freshContext = await context.browser()!.newContext({ storageState: authState });
    const freshPage = await freshContext.newPage();

    // Close via Escape.
    await freshPage.goto(DEEP_LINK);
    await expect(freshPage.getByRole('tab', { name: 'Storico', selected: true })).toBeVisible();
    await expect(freshPage.getByText('Nessuna attività registrata.')).toBeVisible();
    await freshPage.keyboard.press('Escape');
    await expect(freshPage).toHaveURL(/\/aste\/immobili(\?|$)/);
    let url = freshPage.url();
    expect(url).toContain('cluster=2');
    expect(url).not.toContain('pannello');

    // Close via the dedicated close button.
    await freshPage.goto(DEEP_LINK);
    await expect(freshPage.getByRole('tab', { name: 'Storico', selected: true })).toBeVisible();
    await freshPage.getByRole('button', { name: 'Chiudi' }).click();
    await expect(freshPage).toHaveURL(/\/aste\/immobili(\?|$)/);
    url = freshPage.url();
    expect(url).toContain('cluster=2');
    expect(url).not.toContain('pannello');

    await freshContext.close();
  });
});
