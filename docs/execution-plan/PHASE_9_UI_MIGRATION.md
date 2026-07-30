# Phase 9 — UI Library Migration: PrimeReact → Radix UI

> Goal: remove PrimeReact (whose styled theming requires a commercial license — the running app shows an "Invalid PrimeUI License" watermark on every screen) and replace it with fully open-source **Radix UI** primitives, styled by hand against the existing design tokens. This is a **behaviour-preserving** swap: the app must look and behave identically afterwards — the visual redesign is the next phase (Phase 10), not this one. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React SPA (today built on **PrimeReact**, which this phase removes) over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. Every feature exists and is tested (Phases 0–8). PrimeReact's styled preset system requires a paid license this project will not buy, so its components must go — replaced like-for-like, with **no change to appearance or behaviour** — before the design-system work (Phase 10) and the hardening pass (Phase 11) run.

**State when this phase starts:** Phases 0–8 delivered the full feature set with all suites green — see `HANDOFF_PHASE_0..8.md`. The app depends on PrimeReact for six components only; the heaviest, most performance-critical surface (the thousands-of-rows table) never used it.

## Required reading

- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §1 (structure), §4 (tables — note the table is already custom, not PrimeReact), §5 (tokens/design-system), §7 (keyboard/ARIA/dialog obligations that must survive the swap)
- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §11 (the a11y/responsive behaviours to preserve exactly), §4.5 (the workspace = a modal dialog), §2.5 (the user menu)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §5 (the e2e flows that gate this phase), §8 (the six quality gates)
- `handoffs/HANDOFF_PHASE_4.md` — the authoritative record that the table is custom (`@tanstack/react-virtual`, not PrimeReact `DataTable`) and that only PrimeReact `Tabs` is used on the dashboard
- `handoffs/HANDOFF_PHASE_6.md` — how the workspace `Drawer` was forced to `role="dialog"` over PrimeReact's default `role="complementary"`; that guarantee must be re-established with Radix

## Entry criteria

1. `HANDOFF_PHASE_8.md` outcome `complete`; all gates green at the inherited commit.

## Scope reality (verified against the codebase, not assumed)

Only **six** PrimeReact components are used, across 16 of 49 `.tsx` files: `Button`, `InputText`, `InputPassword` (flat-prop form primitives), `Tabs` (cluster nav, bucket tabs, the workspace panel's tabs, the admin calendar-assignment tabs), `Drawer` (the listing workspace panel — the single non-trivial coupling), and `PrimeReactProvider` (bootstrap in `app/providers.tsx`). Facts that shrink this phase:

- **The dashboard table is already PrimeReact-free** — semantic `<table>` + ARIA roles + `@tanstack/react-virtual`, built that way because `primereact@11` ships no working virtualized `DataTable` (recorded in `HANDOFF_PHASE_4.md`). The riskiest surface needs **zero** migration work.
- **`theme/tokens.css` is library-agnostic** (plain CSS custom properties, no `.p-*`/`--p-*` anywhere) and stays untouched. `theme/preset.ts` (the thin PrimeReact token-mapping shim) is **deleted** — no preset system remains to feed.
- The e2e suite selects by **role/text** (`getByRole('tab', { selected })`, `getByRole('menuitem')`, `getByRole('button')`) and by **our own** CSS classes, never PrimeReact's `.p-*` classes — so assertions do not change. Radix `Tabs`/`Dialog` expose `role`/`aria-selected`/`aria-modal` natively.
- No `Dialog`/`ConfirmDialog` or `Menu`/`TieredMenu` is used today (confirmations are `window.confirm()`; the user menu in `Shell.tsx` is hand-rolled). No `pi-*` PrimeIcons classes are referenced in app code.

## Tasks

1. **Dependencies and bootstrap.** Add `@radix-ui/react-tabs` and `@radix-ui/react-dialog` to `apps/web/package.json`; remove `primereact`, `@primereact/core`, `@primeuix/themes`, `primeicons`. Remove the `primeicons/primeicons.css` import from `main.tsx`, the `PrimeReactProvider` wrapper from `app/providers.tsx`, and **delete `apps/web/src/theme/preset.ts`**. `theme/tokens.css` and `theme/fonts.css` are unchanged. (The PrimeReact AI CLI plugin was never a repo dependency — nothing to remove there.)
2. **Replacement primitives** in a new `apps/web/src/components/` folder, kept thin so the ~15 consuming files change minimally: `Button`, `TextInput`, `PasswordInput` (plain `<button>`/`<input>` over the existing CSS classes; `PasswordInput` re-implements the show/hide toggle with a button + inline SVG), a `Tabs` wrapper over `@radix-ui/react-tabs`, and a `Dialog`/`Panel` over `@radix-ui/react-dialog`. Match the current props each call site relies on (e.g. `Button` takes children, not a `label` prop — the pre-existing convention).
3. **Roll out the form primitives** across auth (`LoginScreen`, `ForcedPasswordChange`), admin (`CreateUserForm`, `AccountRow`, `RandomAssignTab`, `RemoveAssignTab`, `ByIdAssignTab`, `CategoriesScreen`), and the dashboard `DataTable/Toolbar`.
4. **Roll out Tabs** across the six files (`ClusterNav`, `BucketTabs`, `AreaView`, `ClusterSection`, `WorkspacePanel`, `CalendarAssignmentScreen`). Migrate the CSS active-state selectors from PrimeReact's `[data-active]` to Radix's `[data-state="active"]`; keep the tab-nav's URL-search-param driving intact.
5. **Convert the workspace Drawer** (`WorkspacePanel.tsx`, the one non-trivial piece) to a `@radix-ui/react-dialog` styled as a right-side slide-in panel. Re-establish — via Radix's native support this time, not an internals workaround — the exact guarantees the current implementation proved: `role="dialog"`, `aria-modal`, focus trap, focus restored to the trigger on close, `Esc` closes, background scroll locked, `aria-labelledby` on the title. Preserve the URL-state behaviour exactly: closing navigates back to `/aste/:area` with the search params intact; the panel is a route, not ephemeral state.
6. **Behaviour-preserving verification.** `pnpm lint / typecheck / test / build / test:integration / e2e` all green, with the **full e2e suite passing with zero assertion changes** (a genuinely wrong assertion is fixed with its reasoning recorded, never weakened to pass). A final grep proves zero `primereact` / `@primereact` / `@primeuix` / `primeicons` references remain anywhere under `apps/web`, and `apps/web/package.json` carries none.
7. **Visual parity check** in a real browser (the Phase 4–8 library-Playwright screenshot approach): before/after screenshots of the principal screens must be **indistinguishable** — no visual change is the goal, not a side effect. Record the comparison in the handoff.
8. **Verify, commit, handoff.**

## Verification

- All six quality gates green (`TESTING.md` §8), the full e2e suite green with unchanged assertions.
- Grep clean: no PrimeReact-family import or dependency anywhere in `apps/web`.
- Workspace panel still a modal dialog: `role="dialog"` + `aria-modal`, focus trapped and restored, `Esc`-dismissable, scroll-locked — re-verified, not assumed.
- Before/after screenshots of the principal screens are visually identical.

## Constraints

- **Behaviour- and appearance-preserving only.** No new visual language, no restyling, no spacing/colour/typography changes — that is Phase 10. Same look, different implementation underneath.
- No Tailwind or CSS-in-JS introduced; stay with the established plain-CSS-against-`tokens.css` pattern. Icons via inline SVG unless a concrete need emerges.
- `theme/tokens.css` unchanged. Do not weaken tests to pass; a wrong test is fixed with its reasoning recorded (`00_OVERVIEW.md` §5).

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_9.md` from the template. In *Carry-over*: the new `components/` primitives and their APIs, the `[data-active]` → `[data-state="active"]` CSS migration, exactly how the workspace dialog now proves its `role`/focus-trap/`Esc`/scroll-lock guarantees with Radix (so Phase 11's hardening can lean on it and the Appendix-B easter-egg dialogs can reuse the Radix `Dialog`), the visual-parity screenshot result, and the note that **Phase 10 is the visual redesign** (modern-enterprise blue/white + dark mode via Hallmark) — this phase deliberately changed nothing visible.
