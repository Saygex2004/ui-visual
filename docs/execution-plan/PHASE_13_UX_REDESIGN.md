# Phase 13 — UX Redesign: Claude Design Reference Adoption

> Goal: rethink the whole interface against the **PVP Aste Dashboard** Claude Design reference — a navy/blue visual language (Hanken Grotesk, uppercase micro-labels, card-on-paper layout) and a set of deliberate UX pattern changes (searchable cluster/region comboboxes, underline tabs, active-filter chips, overflow row actions, row-click drawer, mention-driven participant management) — while preserving every functional behaviour the app already has. Unlike Phase 10, this phase **does change interaction patterns**, each one enumerated in Constraints and mirrored into the Specifications. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol. This phase runs **after Phase 10 and before Phases 11–12** (hardening must verify the redesigned UI, not the old one).

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + Radix UI SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. Every feature exists (Phases 0–8), PrimeReact is gone (Phase 9), and a token-driven design system with full dark mode is in place (Phase 10, plus the ad-hoc "FASE 10.5" beautification commit). The project owner has now supplied a **Claude Design mockup** (`PVP Aste Dashboard.dc.html`, claude.ai/design project `9a6a3659-ac8c-4d46-9b8f-06abe620f442`) as the primary UX/UI reference: the app must closely match its style, layout principles and interaction patterns. The mockup is a visual prototype, not a complete application — where it omits existing functionality (sorting, OMI drill-down, Archivio, virtualization, dark mode, the rich-text composer, calendar/admin/auth), that functionality is preserved and folded into the new language.

**State when this phase starts:** Phases 0–10 complete with all gates green — see `HANDOFF_PHASE_0..10.md`. `theme/tokens.css` holds the Cobalt light+dark token sets (Inter, no uppercase labels); components are hand-styled plain CSS against those tokens; cluster selection is a pill-row of Radix tabs, regions are chip rows, table row actions are emoji-prefixed inline links (the "Vai all'annuncio" label truncates in the 260px frozen column), participants are added through a native select flow, and `window.confirm`/`alert` are still used for archive and chat-close confirmations.

## Required reading

- The design reference itself: import `PVP Aste Dashboard.dc.html` (and its `support.js` logic) from the Claude Design project above — it defines the app bar with clickable logo, the home view cards, the selector toolbar (cluster combobox + region select), underline tabs flush on the filter card, the active-filter chip row, the table with "Apri scheda" + overflow-menu actions, the 480px drawer, and the chat mention flow
- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §5 (design system, tokens, dark mode), §6 (i18n), §7 (cross-cutting UI obligations)
- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — the behavioural source of truth; this phase amends it (see Tasks 9)
- `design.md` (repository root) — the locked design system this phase amends; "amend intentionally; the file is the rule"
- `handoffs/HANDOFF_PHASE_10.md` — the token architecture and theme-toggle mechanism this phase inherits

## Entry criteria

1. `HANDOFF_PHASE_10.md` outcome `complete`; light+dark token system live; all gates green at the inherited commit.
2. The Claude Design reference is accessible (or a saved copy of `PVP Aste Dashboard.dc.html` is available in-session).

## Design intent (from the project owner)

Match the reference closely: navy (`#16224e`-anchored) brand + blue accent on cool near-white paper, **Hanken Grotesk** single family, **11px uppercase tracked micro-labels** for field labels / column headers / KV metadata (an intentional reversal of the Phase 10 no-uppercase correction — recorded in `design.md`), pill badges, soft popover elevation, 120–250ms functional motion. Compact, scalable selection controls instead of space-hungry pill/chip rows; real tabs for Procedure principali / Fallimenti; grouped labeled filters with removable active-filter chips; standardized non-truncating row actions; a clickable logo that always returns to "Scegli una vista"; a mention-driven, low-friction participant flow. Confirmed decisions: table rows show a **read-only** rating dot (editing lives in the drawer's segmented control); the homepage shows **only the two real views** (no "Presto" placeholders); the @-mention inserts **bold plain text** and adds the participant through the existing API (no rich-text schema or sanitizer change).

## Tasks

1. **Docs first.** Amend `design.md` (theme, typography, micro-label reversal, logo mark, motion, token table) and add this phase to `00_OVERVIEW.md` §6 with its ordering note.
2. **Foundations.** Rewrite `apps/web/src/theme/tokens.css` values (names preserved) to the reference palette converted to OKLCH — light + derived dark set, contrast-verified (the mockup's muted greys and status-on-tint text fail AA as-is; darken them, keep the character). Add: brand tokens (`--color-brand`, `-strong`, `-fill`, `-fill-contrast`), `--color-border-soft`, status `-strong`/`-soft` completions, categorical ramp `--color-cat-1…7` (cluster dots, avatars), popover/drawer shadows, `--dur-pop`/`--dur-slide`, and the `pvp-fade/pop/slide/up/shimmer/spin` keyframes under the existing reduced-motion guard. Swap Inter → `@fontsource/hanken-grotesk`.
3. **Primitives.** Add `@radix-ui/react-popover` + `@radix-ui/react-dropdown-menu`; build `DropdownMenu`, `Popover`, `SearchSelect` (combobox), `SelectField`, the `Field` micro-label pattern, `Badge`, `Chip`, `Avatar`/`AvatarStack`, `Skeleton`, `ConfirmDialog`; restyle `Button` (primary/brand/tinted/ghost/icon voices), `TextInput`, `StatusDisplay`, and a shared underline-tab style. Filters keep **styled native selects**.
4. **Shell + landing.** Clickable CSS-drawn logo (navy tile + bars + wordmark) linking to `/`; route-aware breadcrumb; user pill on `DropdownMenu`. Landing: last-update badge, view-card grid with real counts.
5. **Dashboard restructure.** Area header with horizontal KV metadata and top-right navy refresh button; cluster pill-row → searchable **cluster combobox** (Archivio pinned as final option; URL `cluster` semantics unchanged); region chips → **region select** in the same selector-toolbar card, with capital/province drill-down as progressive disclosure and the OMI panel as a soft card; underline bucket tabs flush on the filter card; labeled filters + active-filter chip row (chips also expose drill-down state); table redesigned per the reference (stacked Anno/N°, read-only rating dot, "Apri scheda" + ⋯ overflow menu — labels never truncate, emoji removed, row click opens the drawer) with virtualization, sorting (`aria-sort`), and the frozen actions column preserved; skeleton/empty/error states per the reference; `window.confirm`/`alert` → `ConfirmDialog`.
6. **Drawer + chat.** Workspace panel restyled (480px, slide-in, underline tabs, segmented rating, KV grid, timeline); participants → avatar stack + "+ Aggiungi" search popover on the existing candidates/add API; TipTap `@`-mention suggestion that inserts bold text **and** adds the participant; Enter-to-send (Shift+Enter newline); bubbles layout; composer keeps formatting toolbar + attachments in the reference's pill container.
7. **Secondary surfaces.** Auth, calendar, admin re-skinned to the same language; the admin bespoke tab style is deleted in favour of the shared underline tabs.
8. **States, dark, a11y sweep.** Motion applied consistently; full manual light+dark pass (the mockup is light-only — dark derives from the token table); axe both themes; reduced-motion; ~360px floor.
9. **Specs + tests.** Update `FUNCTIONAL_SPECIFICATIONS_UI.md` and `FRONTEND.md` §5 for every sanctioned behaviour change; update unit tests (`RatingControl`, `filterModel`) and every affected e2e spec — the pure-logic suites (`urlState`, `blocco`, `sessionArchive`, `drilldownHelpers`, `filterModel` core) must pass **unchanged** as the regression signal.
10. **Verify, commit, handoff.**

## Verification

- Visual: the app closely matches the reference on every surface it covers, in both themes; surfaces the reference omits (calendar, admin, auth, archive, OMI) read as the same product.
- The full URL-state contract (`urlState.ts`) round-trips unchanged; deep links and back/forward behave exactly as before.
- All six quality gates green (`TESTING.md` §8); e2e green, with every assertion change recorded and justified in the handoff.
- axe clean in both themes on the principal screens; keyboard operability of every new popover/combobox/menu (open, navigate, select, dismiss).
- No truncated action labels at any supported viewport; no `window.alert`/`window.confirm` remains in `apps/web`.

## Constraints

- **Sanctioned behaviour changes — exhaustive list.** Cluster/region selection via combobox/popover (URL params unchanged); row click opens the scheda drawer; row actions consolidated into "Apri scheda" + overflow menu; rating editing moves to the drawer (rows show a read-only dot); participant add via search popover and @-mention (same API); Enter-to-send in chat; native confirms replaced by `ConfirmDialog`. Anything beyond this list is out of scope — record it, do not fold it in.
- The URL-state contract, table virtualization, sorting semantics, the workspace panel's focus-return fix, unread badges, and the i18n/no-literal/no-raw-hex disciplines are inviolable.
- Stay within plain-CSS-against-tokens (no Tailwind/CSS-in-JS); Radix primitives only from the open-source `@radix-ui/react-*` set; Lucide icons; no commercial-licensed dependency.
- Do not weaken tests to pass a gate; a genuinely obsolete assertion is updated with its reasoning recorded (`00_OVERVIEW.md` §5).

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_13.md` from the template. In *Carry-over*: the final token architecture (brand vs accent split, categorical ramp, dark derivations), the new primitives inventory and where each is used, every behaviour change shipped (against the Constraints list) with its spec-doc amendment, every unit/e2e assertion change and why, surfaces deliberately left lighter, and what Phase 11 (Hardening) must re-verify on the redesigned UI (axe both themes, keyboard-only passes, responsive floors, reduced motion).
