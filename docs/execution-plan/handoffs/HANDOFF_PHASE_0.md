# Handoff — Phase 0: Bootstrap (New Monorepo, Tooling, Skeletons, Docs)

- **Phase:** 0 — Bootstrap
- **Date:** 2026-07-23
- **Outcome:** complete

## 1. Completed

Built **in-place in the `ui-visual` git repository** (operator decision — not a
new sibling `pvp-dashboard` repo; the monorepo lives at the repo root and we
commit to `ui-visual`'s `main`). Task by task:

1. **Docs moved in.** `git mv ui-execution-plan docs/`. The documentation set is
   now at `docs/` (`docs/specifications/`, `docs/execution-plan/` incl.
   `handoffs/`, `docs/FUNCTIONAL_SPECIFICATIONS_UI.md`, `docs/FAQ_...md`).
   Internal relative links unchanged (structure preserved). **From now on
   sessions read the in-repo `docs/` copies and write handoffs here.**
2b. **Hallmark installed via its installer** — `.agents/skills/hallmark/SKILL.md`
   present; `skills-lock.json` records `source: nutlope/hallmark`,
   `sourceType: github`, a `computedHash`. Not a folder copy. Verified. (The
   operator ran `npx skills add nutlope/hallmark`.)
3. **Workspace root:** `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root
   `package.json` with the six gate scripts (`lint`, `typecheck`, `test`,
   `test:integration`, `e2e`, `build`) + `emulators`/`dev:*` helpers,
   `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, etc.),
   `eslint.config.js` (flat, typescript-eslint + eslint-plugin-react incl.
   **`react/jsx-no-literals`** on `apps/web`), `.prettierrc` + `.prettierignore`,
   `.gitignore`, `.env.example` (every CONFIGURATION.md §1–4 variable), `README.md`.
4. **`packages/shared` stub** — `src/{schemas,domain,constants}/`, `index.ts`
   exporting a placeholder constant, Vitest config, **1 passing test**. Only
   runtime dep is Zod.
5. **`apps/server` skeleton (Fastify 5)** — `src/config.ts` (Zod env, fail-fast
   naming the variable), `plugins/errorEnvelope.ts` (exact
   `{ error: { code, key, details } }` shape + `ApiError` + not-found handler),
   pino logger configured in `app.ts` (pretty in dev / JSON in prod, `genReqId`
   UUID), `modules/health/` (`/healthz` 200, stub `/readyz`), **3 passing
   injection/config tests**.
6. **`apps/web` skeleton (Vite 8 + React 19 + TS)** — PrimeReact 11 with a
   styled preset (`theme/preset.ts`) wired to `theme/tokens.css`; TanStack
   Router (code-based) with `/` and `/login`; TanStack Query provider;
   react-i18next locale `it` with all 9 FRONTEND.md §6 namespaces; the landing
   renders the proof string from `i18n/locales/it/common.json`; **2 passing
   i18n tests**. **PrimeReact AI CLI plugin installed automatically** (`pnpm dlx
   @primeui/cli plugin install --tool claude --library primereact`) — status
   `installed` from the `primeui` marketplace (Claude Code user scope).
7. **Hallmark foundations** — ran scoped to *foundations only*. Genre
   **modern-minimal**, theme **Cobalt** (cool engineered near-white, one
   electric-cobalt signal, hairline structure, mono voice — fits a dense,
   data-heavy Italian dashboard). `apps/web/src/theme/tokens.css` holds the
   palette (Cobalt OKLCH anchors), the 2+1 type pairing, and spacing/radius/
   shadow/motion scales; `theme/fonts.css` bundles the fonts **locally** via
   `@fontsource` (Space Grotesk 500/600, Inter 400/500/600, JetBrains Mono
   400/500) — no CDN, builds offline. The PrimeReact preset references only
   `var(--…)` tokens (no raw hex).
8. **Emulators** — `firebase/firebase.json` (Firestore `8081`, Storage `9199`,
   UI `4001`, `singleProjectMode`), `firestore.rules` + `storage.rules`
   (deny-all), `firestore.indexes.json` (empty placeholder). Root script
   `pnpm emulators` (`cd firebase && firebase emulators:start --project
   demo-pvp-dashboard`).

### Verification results (actual)

- `pnpm install` · `pnpm lint` · `pnpm typecheck` · `pnpm test` (6 tests) ·
  `pnpm build` — **all green**.
- Server boots; `GET /healthz` → **200** `{"status":"ok"}`; `GET /readyz` →
  **200**. Starting without `PVPDASH_SESSION_SECRET` **refuses to start**,
  printing `PVPDASH_SESSION_SECRET: Invalid input…` and exiting non-zero.
- ESLint `react/jsx-no-literals` **fails** a deliberate hardcoded JSX string
  (probe added, error confirmed, probe removed).
- `tokens.css` imported by `main.tsx`; preset references its variables only.
- `.agents/skills/hallmark/SKILL.md` present (installer-produced).
- AI CLI plugin installed + verified (`plugin status` → installed).
- **Emulator config valid** — firebase-tools parses it and attempts to start
  firestore+storage, failing **only** on the missing Java runtime (see §3).

## 2. Notes, observations, implementation details

- **Version calls (current-stable at 2026-07-23):** Node **24.15.0**, pnpm
  **11.16.0**. React **19.2**, PrimeReact **11.0** (peer: React ≥19), Vite
  **8.1**, Vitest **4.1**, Fastify **5.10**, Zod **4.4**, TanStack Router
  **1.170** / Query **5.101**, react-i18next **17** / i18next **26**, ESLint
  **10.7**, typescript-eslint **8.65**, Prettier **3.9**. Lockfile committed.
- **TypeScript pinned to 5.9.3, NOT 7.0.** TS 7 (native compiler) is published
  but the surrounding toolchain (typescript-eslint 8, Vite/Vitest type layers)
  is not yet validated against it — deliberate stability choice for a "boringly
  solid" skeleton. Revisit when the ecosystem catches up.
- **ESLint 10 × eslint-plugin-react 7.37 incompatibility.** The plugin's React
  version *auto-detect* path calls `context.getFilename()`, removed in ESLint
  10, and crashes. Fix: set `settings.react.version` to a concrete `'19.2'` in
  `eslint.config.js` (skips detection). If more plugin rules break under ESLint
  10 later, the fallback is to pin ESLint to `^9`.
- **PrimeReact 11 API drift from its own README.** The provider is
  `import { PrimeReactProvider } from '@primereact/core'` (add `@primereact/core`
  as a direct dep — it is otherwise transitive), and the theme is passed as a
  **direct prop**: `<PrimeReactProvider theme={{ preset }}>` — *not* the
  README's `value={{ theme: { preset } }}`. Preset built with `definePreset(Aura, …)`
  from `@primeuix/themes` (base `@primeuix/themes/aura`).
- **pnpm build-script gate:** esbuild's postinstall is gated by pnpm; approved
  via `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml` (needed for
  Vite/Vitest). pnpm also added a `minimumReleaseAgeExclude` block automatically.
- **Prettier scope:** `.prettierignore` excludes `docs/`, `.agents/` (vendored
  Hallmark skill), `pnpm-lock.yaml`, build output — only our own source is
  format-gated.
- Fastify's top-level `disableRequestLogging` is deprecated in v5; removed it
  (the default already logs requests).
- Empty per-namespace i18n JSON files (`auth/dashboard/…json = {}`) are
  intentional placeholders; keys are added by their owning phases.

## 3. Blockers and unresolved issues

- **Java runtime absent → `pnpm emulators` cannot fully start.** This is the one
  Phase 0 verification line not exercised end-to-end. The config is confirmed
  valid (firebase-tools reaches the firestore/storage start step and fails only
  on `java -version`). **Unblock (operator):** `brew install openjdk`, then link
  it onto the PATH / system JVM dir per brew's post-install hint, and verify
  `java -version`. Needed from **Phase 2** onward (Phase 1 is fully offline).
- Nothing else outstanding. No conflicts with the Specifications encountered.

## 4. Carry-over for the next phase

- **Repo/branch:** work is in `ui-visual`, branch **`main`**, committed as the
  Phase 0 bootstrap commit. Next phase continues on `main`.
- **Commands known to work:** `pnpm install`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build`, `pnpm dev:server` (port 8080; honours `PORT`),
  `pnpm dev:web` (port 5173, `/api` proxied to `:8080`).
- **Command NOT yet working:** `pnpm emulators` — needs Java (see §3).
- **Env:** no `.env` committed; copy `.env.example` → `.env` for local runs.
  Server loads **no** dotenv automatically (env comes from the shell / process).
  Emulator ports if/when used: Firestore `127.0.0.1:8081`, Storage
  `127.0.0.1:9199`, UI `4001`; demo project id `demo-pvp-dashboard`.
- **`packages/shared` is a stub.** **Phase 1 is fully offline** (no emulator
  needed): it fills `schemas/`, `domain/`, `constants/`, `seed/fixtures/`, and
  the TESTING.md §2 unit catalog. Keep `packages/shared` at zero runtime deps
  beyond Zod. **Phase 2 will require `pnpm emulators`** (hence Java first).
- **Design contract for later UI phases:** tokens in
  `apps/web/src/theme/tokens.css` (Cobalt), consumed via the PrimeReact preset
  (`theme/preset.ts`); fonts local via `theme/fonts.css`. No raw hex/font
  literals in components — lint/review enforced.
