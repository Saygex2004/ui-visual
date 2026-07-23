# Phase 0 — Bootstrap (New Monorepo, Tooling, Skeletons, Docs)

> Goal: create the `pvp-dashboard` repository — pnpm workspace, both application skeletons, the shared package stub, documentation moved in, i18n scaffolding, design tokens from a Hallmark foundations pass, and green quality gates on essentially empty code. No Firebase account, no emulator data, no features. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — an Italian-language, auth-gated dashboard over a shared Cloud Firestore database that a separate, already-running scraper project keeps current. The system is a TypeScript monorepo: a React + **PrimeReact** SPA (`apps/web`, Vite, TanStack Router/Query, react-i18next) and a **Fastify + Zod** API (`apps/server`) that mediates every database access via the Firebase Admin SDK, plus a pure shared package (`packages/shared`) holding schemas and domain rules. Contracts live in `../specifications/`; interface behaviour in `../FUNCTIONAL_SPECIFICATIONS_UI.md`. This phase lays the ground every later phase builds on — its job is a boringly solid skeleton, not features.

**State when this phase starts:** nothing exists. This documentation set is available in the location the operator provides it; the new repository is created by this session.

## Required reading

- [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md) — §1 (stack and rationale), §2 (architecture), §3 (repo structure)
- [`REPOSITORY_STRUCTURE.md`](REPOSITORY_STRUCTURE.md) — the target tree this phase instantiates
- [`../specifications/CONFIGURATION.md`](../specifications/CONFIGURATION.md) — all of it (config module + `.env.example`)
- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §1 (web structure), §5 (tokens, PrimeReact preset, AI CLI plugin, Hallmark), §6 (i18n rules)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §1 (offline-by-default), §8 (quality gates)

## Entry criteria

1. This documentation set is available to copy into the new repository.
2. Node LTS and pnpm are installed (record exact versions in the handoff).
3. The developer is reachable during the session: tasks 2b and 6 may require their hands (the manual-intervention protocol of `00_OVERVIEW.md` §7 applies).

## Tasks

1. **Create the repository.** A new directory `pvp-dashboard` (sibling of wherever this documentation was provided, unless the operator says otherwise); `git init`; first commit can come after task 3.
2. **Copy the documentation in:** this entire set → `docs/` (`FUNCTIONAL_SPECIFICATIONS_UI.md`, `specifications/`, `execution-plan/` including `handoffs/`), per `REPOSITORY_STRUCTURE.md` §1. From now on the in-repo copies are the ones sessions read and the handoffs are written into.

   **2b. Install the Hallmark design skill — developer step.** Hallmark **must** be installed with its own installer, `npx skills add nutlope/hallmark`, run from the repository root — **never by copying or pasting a skill folder into the project** (a copied folder bypasses the installer's registration and version tracking). The installer is interactive, so pause the workflow here and hand the developer exactly this:

   > *Hallmark (the design skill this project's UI phases rely on) needs a one-time interactive install. From the repository root, run:*
   > ```
   > npx skills add nutlope/hallmark
   > ```
   > *Accept the prompts (default target). When it finishes, tell me and I'll verify and continue.*

   After the developer confirms, **verify**: `.agents/skills/hallmark/SKILL.md` exists and names the skill. If the install fails, record the error verbatim, retry once with the developer, and otherwise end the session `blocked` per the protocol — do not substitute a manual copy.
3. **Workspace root:** `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root `package.json` with the six gate scripts (`lint`, `typecheck`, `test`, `test:integration`, `e2e`, `build`), `tsconfig.base.json` (strict), ESLint + Prettier config **including the no-literal-JSX-strings rule** (`FRONTEND.md` §6), `.gitignore` and `.env.example` per `CONFIGURATION.md` §6, and a `README.md` quickstart (install → emulators → seed → dev → test; keep it short, link into `docs/`).
4. **`packages/shared` stub** (`schemas/`, `domain/`, `constants/`, an exported placeholder constant) with its Vitest setup — one trivial passing test.
5. **`apps/server` skeleton:** Fastify app with `src/config.ts` (Zod-validated env per `CONFIGURATION.md`, fail-fast with the variable named), the pino logging plugin, the error-envelope plugin (`API_CONTRACT.md` §1 shape), and `modules/health/` serving `/healthz` and a stub `/readyz`; one injection test that boots the app with a valid test env and gets `200`.
6. **`apps/web` skeleton:** Vite + React + TypeScript; **PrimeReact** installed with the styled preset stub wired to `theme/tokens.css`; TanStack Router with two placeholder routes (`/` and `/login`); TanStack Query provider; **react-i18next** configured with locale `it` and the namespace layout of `FRONTEND.md` §6, one `common.json` entry rendered on the placeholder page (the proof string).

   Then the **PrimeReact AI CLI plugin** (dev-time only; nothing imports it at runtime). **First attempt the installation automatically and independently**, following the plugin's official guide at `https://primereact.dev/docs/styled/guides/ai/plugin.md` (fetch the current instructions — the exact command may have changed since this document was written). If the automatic install succeeds, verify it (the plugin's own check, or its presence in the dev toolchain) and move on, recording the commands used in the handoff. **If it cannot be completed automatically** — the command needs interactive input, an account, an editor-side step, or it simply fails — apply the manual-intervention protocol (`00_OVERVIEW.md` §7): pause, tell the developer plainly that the plugin could not be installed automatically and why, and give simple numbered steps to finish it by hand, in this shape:

   > *I couldn't complete the PrimeReact AI CLI plugin install automatically (reason: `<reason>`). To finish it manually:*
   > 1. *Open `https://primereact.dev/docs/styled/guides/ai/plugin.md`.*
   > 2. *Run the install command shown there from `apps/web/` (currently of the form `npx …`).*
   > 3. *Answer its prompts with the defaults unless the guide says otherwise.*
   > 4. *Tell me when it's done — I'll verify and continue.*

   Verify after either path; if the plugin remains uninstallable, record it as a blocker with the error verbatim — the phase may still complete (the plugin is an aid, not a runtime dependency), noting it prominently in the handoff.
7. **Hallmark design foundations.** Run the Hallmark skill's default design flow scoped to *foundations only* for this product (a dense, data-heavy, Italian-language professional dashboard): produce `apps/web/src/theme/tokens.css` — palette, type pairing (2+1 fonts, bundled locally, no CDN), spacing/radius/shadow scale — and map the tokens into the PrimeReact preset stub. No screens are designed in this phase; the tokens are the contract Phases 4/6/7 build with. Note the chosen theme/route in the handoff.
8. **Emulator config:** `firebase/firebase.json` declaring the Firestore and Storage emulators with fixed ports (no login required to run emulators); a root script `pnpm emulators` that starts them.
9. **Verify, commit, handoff.**

## Verification

- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` — all green at the root.
- `pnpm --filter server dev` boots and `GET /healthz` answers `200`; starting it with a required variable missing **refuses to start** naming the variable.
- `pnpm --filter web dev` serves the placeholder; the visible string comes from `i18n/locales/it/common.json` (change the JSON, see the change); the ESLint literal-string rule **fails** a deliberately added hardcoded JSX string (then remove it).
- `pnpm emulators` starts both emulators on the declared ports.
- `tokens.css` exists, is imported, and the PrimeReact preset references its variables (no raw hex in the preset).
- `.agents/skills/hallmark/SKILL.md` exists and was produced by `npx skills add nutlope/hallmark` (task 2b), not by a folder copy.
- The AI CLI plugin is installed and verified — or its failure is recorded as a blocker with the manual instructions having been handed to the developer.

## Constraints

- **No Firebase account, no production project id, no service account** anywhere in this phase — emulator config only.
- **Hallmark only via its installer** (`npx skills add nutlope/hallmark`, task 2b) — never a copied/pasted skill folder, even if one is available nearby.
- **Manual steps follow the `00_OVERVIEW.md` §7 protocol** — pause, instruct, wait, verify, record; never silently skipped or simulated.
- **No feature code.** Placeholders stay placeholders; resist scaffolding ahead (later phases own their modules).
- Dependency versions: current stable at execution time; commit the lockfile; note major versions in the handoff.
- Fonts and every other asset are bundled locally — the app must build and run offline (and the production CSP posture assumes no external hosts).

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_0.md` from the template. In *Carry-over*: exact Node/pnpm versions, the working commands (dev servers, emulators, gates), the Hallmark theme decision and token file location, how each of the two guided installs went (Hallmark via `npx skills add`; the AI CLI plugin — automatic or manual, with any quirks), and the reminder that **Phase 1 is fully offline** (no emulator needed) while **Phase 2 will need `pnpm emulators`**.
