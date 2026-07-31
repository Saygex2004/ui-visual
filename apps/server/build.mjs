// Production build (Execution Plan Phase 12): bundle the server into a single
// self-contained ESM file that `node dist/index.js` can run directly.
//
// Why a bundler rather than `tsc`: `@pvp/shared` and `@pvp/seed` are consumed
// as TypeScript SOURCE (their package `exports` point at `.ts`; `@pvp/seed`'s
// own `build` is a deliberate no-op — it "ships as source, run via tsx"). A
// plain `tsc` build leaves `import ... from '@pvp/shared'` in the emitted JS,
// which Node then resolves to a `.ts` file it cannot execute. Everything until
// now ran via tsx (dev), vitest (tests) or the emulators — this is the first
// time a plain-Node production runtime is required. esbuild inlines the
// first-party TypeScript and leaves every npm/runtime dependency external
// (installed in the Docker runtime stage), so the result is a slim
// `dist/index.js` with a small `node_modules` beside it.
//
// The bundled `@pvp/seed` code (fixture loading, the emulator signing key) is
// DEAD in production — it is only ever reached under `PVPDASH_SEED=1` or when
// `FIRESTORE_EMULATOR_HOST` is set, neither of which is ever true on Cloud Run
// (CONFIGURATION.md §3). It is bundled but never executed.
import { build } from 'esbuild';

// Externalize every bare import (npm dependency or Node builtin), bundle only
// relative imports and the two first-party workspace packages. More robust
// than enumerating: it also externalizes transitive bare imports reached
// through the bundled `@pvp/*` source (e.g. `firebase-admin/app`).
const externalizeBareImports = {
  name: 'externalize-bare-imports',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const path = args.path;
      const isRelative = path.startsWith('.') || path.startsWith('/');
      const isFirstParty = path === '@pvp/shared' || path === '@pvp/seed';
      if (isRelative || isFirstParty) return null; // let esbuild bundle it
      return { path, external: true }; // npm dep / node builtin → external
    });
  },
};

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
  plugins: [externalizeBareImports],
});
