import { defineConfig } from 'vitest/config';

// Offline unit suite (TESTING.md §1) — no network, no emulator. Integration
// specs (*.integration.test.ts) live under vitest.integration.config.ts.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
  },
});
