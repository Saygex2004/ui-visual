import { defineConfig } from 'vitest/config';

// Integration suite (TESTING.md §3) — against the Firestore/Storage emulators.
// Hard guard: refuses to even collect tests unless FIRESTORE_EMULATOR_HOST is
// set, so this suite can never reach production Firestore (TESTING.md §1).
// Run via `pnpm test:integration` at the repo root, which wraps this in
// `firebase emulators:exec` (sets the env var for the duration of the run).
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'test:integration refuses to run: FIRESTORE_EMULATOR_HOST is not set.\n' +
      'Run `pnpm test:integration` from the repo root (starts the emulators via ' +
      '`firebase emulators:exec`), or `pnpm emulators` in one terminal and set ' +
      'FIRESTORE_EMULATOR_HOST yourself in another.',
  );
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Integration tests touch shared emulator state; run files serially.
    fileParallelism: false,
  },
});
