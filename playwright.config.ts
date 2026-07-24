// Playwright config (TESTING.md §5). Runs against the full stack on
// emulators. `pnpm e2e` (root) wraps this in `firebase emulators:exec` — the
// emulators are already up by the time Playwright starts. The API server
// wipes `users`/`usernames`/`sessions` on boot itself (see
// PVPDASH_RESET_ACCOUNTS_ON_BOOT below) so its first boot bootstraps a fresh
// admin — NOT a Playwright globalSetup, because Playwright starts/health-checks
// `webServer` processes *before* running globalSetup, so a wipe there would
// delete the admin bootstrap had just created. The API + web dev servers are
// started/stopped by Playwright itself via `webServer`.
import { defineConfig, devices } from '@playwright/test';

export const E2E_BOOTSTRAP_PASSWORD = 'E2EBootstrapPass1!';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @pvp/server dev',
      url: 'http://127.0.0.1:8080/healthz',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081',
        PVPDASH_FIRESTORE_PROJECT_ID: 'demo-pvp-dashboard',
        PVPDASH_SESSION_SECRET: 'e2e-session-secret-at-least-32-characters-long',
        PVPDASH_BOOTSTRAP_ADMIN_PASSWORD: E2E_BOOTSTRAP_PASSWORD,
        PVPDASH_RESET_ACCOUNTS_ON_BOOT: '1',
        PVPDASH_ENV: 'development',
        PVPDASH_LOG_LEVEL: 'warn',
      },
    },
    {
      command: 'pnpm --filter @pvp/web dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
