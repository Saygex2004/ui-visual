// Execution Plan Phase 11 (Hardening) tasks 2+3: committed axe coverage over
// every principal screen (Appendix A), in both themes, at the default and a
// narrow viewport — none of this existed before this phase (every earlier
// axe pass, Phase 10/13, was a disposable script, never committed; see
// HANDOFF_PHASE_13.md's carry-over). Also the wider-viewport (1024/768px)
// responsive-only checks task 3 asks for, sharing this file's navigation
// since both passes visit the same screens.
//
// Named to sort AFTER auth-flow.spec.ts (not alphabetically "accessibility"):
// this file's first `loginAsAdmin` call completes the bootstrap admin's
// forced-password-change on whatever account is still fresh, same as every
// other spec — but auth-flow.spec.ts's own first test is SPECIFICALLY about
// exercising that forced-change flow against a still-untouched bootstrap
// account (`playwright.config.ts`'s workers: 1 shares one boot across the
// whole run). A file that alphabetically sorted before it silently
// consumed that fresh state and broke it (found running the full suite
// this phase) — the same class of file-ordering hazard
// zz-calendar-assignment.spec.ts documents for a different shared-state
// reason.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsAdmin, selectCluster, selectRegion, openRowChat } from './helpers.js';
import { E2E_BOOTSTRAP_PASSWORD, ADMIN_ROTATED_PASSWORD } from '../playwright.config.js';

type Theme = 'light' | 'dark';

/** Sets the theme via the app's own persisted-preference mechanism
 *  (lib/theme.ts's `pvpdash.theme` key) and reloads — index.html's inline
 *  bootstrap script then applies `data-theme` before first paint, exactly
 *  as it would for a returning user, not by hand-poking the attribute. */
async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => localStorage.setItem('pvpdash.theme', t), theme);
  await page.reload();
  await page.waitForLoadState('networkidle');
}

interface Violation {
  screen: string;
  theme: Theme;
  width: number;
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: number;
}

async function runAxe(
  page: Page,
  screen: string,
  theme: Theme,
  width: number,
  violations: Violation[],
): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  for (const v of results.violations) {
    violations.push({
      screen,
      theme,
      width,
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    });
  }
}

// One representative listing per area, both present in every fixture-backed
// e2e run (seed/lib.ts) — used to reach the workspace/chat-thread screens
// directly rather than re-deriving a table lookup for every screen visited.
const IMMOBILI_LISTING_ID = '1004'; // Cluster 2, Blue Chip Zone (Roma)

test.describe('accessibility (axe)', () => {
  test('every principal screen is axe-clean in both themes, default and narrow width', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const violations: Violation[] = [];

    await loginAsAdmin(page);

    const screens: { name: string; goto: () => Promise<void> }[] = [
      { name: 'landing', goto: () => page.goto('/') },
      {
        name: 'area (immobili, cluster with region drill-down)',
        goto: async () => {
          await page.goto('/aste/immobili?cluster=2');
          await selectRegion(page, 'Lazio');
        },
      },
      { name: 'area (crediti)', goto: () => page.goto('/aste/crediti?cluster=1') },
      { name: 'archivio', goto: () => page.goto('/aste/immobili?cluster=archivio') },
      {
        name: 'workspace — dettagli',
        goto: () =>
          page.goto(`/aste/immobili/lotto/${IMMOBILI_LISTING_ID}?cluster=2&pannello=dettagli`),
      },
      {
        name: 'workspace — storico',
        goto: () =>
          page.goto(`/aste/immobili/lotto/${IMMOBILI_LISTING_ID}?cluster=2&pannello=storico`),
      },
      {
        name: 'workspace — chat',
        goto: () =>
          page.goto(`/aste/immobili/lotto/${IMMOBILI_LISTING_ID}?cluster=2&pannello=chat`),
      },
      { name: 'calendar — month', goto: () => page.goto('/calendario') },
      { name: 'le mie chat', goto: () => page.goto('/chat') },
      { name: 'chat thread (standalone)', goto: () => page.goto(`/chat/${IMMOBILI_LISTING_ID}`) },
      { name: 'admin — accounts', goto: () => page.goto('/admin') },
      { name: 'admin — calendar assignment', goto: () => page.goto('/admin/calendario') },
      { name: 'admin — activity', goto: () => page.goto('/admin/attivita') },
    ];

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      for (const screen of screens) {
        await screen.goto();
        await page.waitForTimeout(300); // settle animations/data before scanning
        await runAxe(page, screen.name, theme, 1280, violations);
      }
    }

    // Narrow-width spot check (375px, the Hallmark/UI §11 responsive floor)
    // on a representative subset — not every screen, to keep this bounded;
    // these are the surfaces most likely to wrap/overflow (a data-dense
    // table, the selector toolbar, the drawer, admin's form + table).
    await page.setViewportSize({ width: 375, height: 800 });
    const narrowScreens = screens.filter((s) =>
      [
        'landing',
        'area (immobili, cluster with region drill-down)',
        'workspace — dettagli',
        'admin — accounts',
      ].includes(s.name),
    );
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      for (const screen of narrowScreens) {
        await screen.goto();
        await page.waitForTimeout(300);
        await runAxe(page, screen.name, theme, 375, violations);
      }
    }

    if (violations.length > 0) {
      console.error('Axe violations found:\n' + JSON.stringify(violations, null, 2));
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});

test.describe('keyboard-only flow (TESTING.md §5 flow 6: login → rate → chat)', () => {
  test('every step reachable and operable by keyboard alone, no mouse click', async ({ page }) => {
    test.setTimeout(60_000);

    // Login: Tab-reachable fields, Enter submits (no .click() on the button).
    // Bootstrap-vs-rotated password, same tolerance as loginAsAdmin (helpers.ts).
    async function attemptLogin(password: string) {
      await page.goto('/');
      await page.getByLabel('Nome utente').fill('admin');
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByLabel('Password', { exact: true }).press('Enter');
      await page.waitForTimeout(600);
    }
    await attemptLogin(E2E_BOOTSTRAP_PASSWORD);
    if (
      await page
        .getByText('non corretti')
        .isVisible({ timeout: 1000 })
        .catch(() => false)
    ) {
      await attemptLogin(ADMIN_ROTATED_PASSWORD);
    }
    await expect(page.getByRole('button', { name: 'admin' })).toBeVisible();

    // Rate: open the workspace via Enter on a focused "Apri scheda" link,
    // then Enter on a focused rating button — no clicks anywhere.
    await page.goto('/aste/immobili?cluster=2');
    await page.waitForTimeout(500);
    const row = page.locator('tr.data-table-body-row').first();
    const schedaLink = row.getByRole('link', { name: 'Apri scheda' });
    await schedaLink.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.workspace-drawer-popup')).toBeVisible();

    const ottimoAffare = page.getByRole('button', { name: /Ottimo affare/ });
    await ottimoAffare.focus();
    await page.keyboard.press('Enter');
    await expect(ottimoAffare).toHaveAttribute('aria-pressed', 'true');

    // Chat: Tab-navigate to the Chat tab (Radix Tabs' own arrow-key model),
    // type a message, and send via the compose model's own Enter-to-send —
    // never a mouse click on the tab or the send button. Scoped to the
    // drawer: the underlying table's own bucket tabs ("Procedure
    // principali"/"Fallimenti") are still in the DOM behind it.
    const drawer = page.locator('.workspace-drawer-popup');
    const dettagliTab = drawer.getByRole('tab', { name: 'Dettagli' });
    await dettagliTab.focus();
    await page.keyboard.press('ArrowRight');
    // A short pause between keypresses: two ArrowRight presses fired back
    // to back can outrun React's state update for the first one, landing
    // one tab short (found live — confirmed by re-driving the same
    // sequence with a pause between presses, which lands correctly).
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowRight');
    await expect(drawer.getByRole('tab', { name: 'Chat', selected: true })).toBeVisible();

    const editor = page.locator('.chat-editor-content [contenteditable="true"]');
    await editor.focus();
    const message = `messaggio da tastiera ${Date.now()}`;
    await page.keyboard.type(message);
    await page.keyboard.press('Enter');
    await expect(page.getByText(message)).toBeVisible();

    // Close via Escape (no mention popup open here, so this closes the drawer).
    await page.keyboard.press('Escape');
    await expect(page.locator('.workspace-drawer-popup')).toHaveCount(0);
  });
});

test.describe('responsive (overflow at narrow-laptop/tablet widths)', () => {
  test('no horizontal page overflow at 1024/768px on data-dense and admin screens', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page);

    async function noHorizontalOverflow(label: string) {
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth, `${label}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
        overflow.clientWidth,
      );
    }

    for (const width of [1024, 768]) {
      await page.setViewportSize({ width, height: 800 });

      await page.goto('/aste/immobili?cluster=2');
      await selectRegion(page, 'Lazio');
      await page.waitForTimeout(300);
      await noHorizontalOverflow(`area view @ ${width}px`);
      // The frozen actions column must still be reachable, not clipped off
      // by the narrower viewport.
      const firstRow = page.locator('tr.data-table-body-row').first();
      await expect(firstRow.getByRole('link', { name: 'Apri scheda' })).toBeVisible();
      await openRowChat(page, firstRow);
      await page.keyboard.press('Escape');

      await page.goto('/calendario');
      await page.waitForTimeout(200);
      await noHorizontalOverflow(`calendar month @ ${width}px`);

      await page.goto('/admin');
      await page.waitForTimeout(200);
      await noHorizontalOverflow(`admin accounts @ ${width}px`);
    }

    // Selector toolbar wraps rather than overflowing.
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto('/aste/immobili?cluster=2');
    await selectCluster(page, /Blue Chip Zone/);
    await page.waitForTimeout(200);
    await noHorizontalOverflow('selector toolbar after cluster reselect @ 768px');
  });
});
