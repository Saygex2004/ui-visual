# Phase 11 — Hardening: Accessibility, Performance, Polish

> Goal: raise every existing surface to the UI spec's §11 bar — keyboard and assistive-technology operability, reduced motion, responsive behaviour, i18n completeness, performance and payload budgets re-validated, designed empty/loading/error states — closed by a consolidated end-to-end regression suite. No new features. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + Radix UI SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. Every feature exists (Phases 0–10), and **Phase 13 has since rebuilt the interface** on the reference-derived design system recorded in `design.md` (navy/blue, Hanken Grotesk, one shared primitive per pattern), with dark mode. This phase is the difference between "works in the demo path" and "holds up under a keyboard-only user, a 4k-row filter, a narrow window, and a stale deploy" — an audit-and-fix session across the whole application, with the quality gates as the referee.

**State when this phase starts:** Phases 0–10 delivered the complete feature set, the Radix migration, and the first design system; **Phase 13** then redesigned every surface against the project owner's Claude Design reference and changed a defined set of interaction patterns (searchable cluster/region comboboxes, row-click-opens-scheda plus an overflow actions menu, rating edited in the workspace drawer, mention-driven participant management, in-application confirmations). Per-phase tests green — see `HANDOFF_PHASE_0..10.md` and **`HANDOFF_PHASE_13.md`**, which is the one that describes the interface you are auditing. Cross-cutting audits have not run.

## Required reading

- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §11 (the bar), plus a full read of §§2–10 against the built app (the audit's checklist)
- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §7 (cross-cutting stances), §5 (design system, primitives inventory), §6 (i18n rules)
- `design.md` (repository root) — the locked design system this phase audits against, and `handoffs/HANDOFF_PHASE_13.md` for what changed and why
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §5 (the six flows, consolidated), §6 (i18n completeness), §8 (gates)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §3 (payload budget), §10 (cadence conformance)

## Entry criteria

1. `HANDOFF_PHASE_13.md` outcome `complete`; all suites green at the inherited commit. (Phase 13 runs between 10 and this one — see `00_OVERVIEW.md` §6's ordering note. `HANDOFF_PHASE_10.md` alone is **not** sufficient: it describes the pre-redesign interface.)

## Tasks

1. **Spec conformance sweep:** walk `../FUNCTIONAL_SPECIFICATIONS_UI.md` §§2–10 screen by screen against the running app; fix deviations; record any *deliberate* deviation with its rationale in the handoff (per the compliance rule). In the same pass, check the design system's mechanical disciplines against `design.md`, in **both light and dark themes**: no raw hex/font literals outside `tokens.css`, no surface forking a pattern instead of using the shared primitive in `apps/web/src/components/`, no floating layer hard-coding a `z-index` outside the `--z-*` scale, no browser-native `alert`/`confirm`/`prompt`, and no emoji used as an icon.
2. **Accessibility audit + fixes** (`FRONTEND.md` §7): keyboard-only pass over every flow (login → browse → drill-down → rate → workspace → chat → calendar → admin); visible focus everywhere; roles/state for tab lists, the user and row **overflow menus**, the cluster/region **comboboxes** and the chat **mention picker** (arrow-key navigation, `Enter` to choose, `Esc` to dismiss, `aria-activedescendant`), and every dialog; labelled filters and inputs; nothing conveyed by colour alone (rating dot, occupancy, cluster marks); axe checks wired into the e2e suite for each principal screen **in both light and dark themes**; `prefers-reduced-motion` honoured across transitions.
3. **Responsive audit:** windows down to narrow-laptop and tablet widths — headers, the selector toolbar, the filter fields and the active-filter chip row all wrap; tables scroll only inside their containers (and the frozen actions column never hides a value at any supported width); body never scrolls horizontally; calendar and admin width-capped and centred; the workspace drawer usable at every width.
4. **i18n completeness:** the `TESTING.md` §6 catalog check green (every referenced key exists in `it`; build fails on missing); a manual sweep for attribute strings, `aria-label`s, and `<title>`s the lint rule cannot see; date/currency formatting via `Intl` everywhere.
5. **State sweep:** every screen's loading, empty, and error states are designed and translated (no blank panels, no raw error text, no untranslated fallback English); the offline/unreachable-server state distinguishes itself from a server refusal.
6. **Performance + payload re-validation:** re-run the 10k-row measurements of Phase 4 across the finished app (rating join, chat badge polling, workspace open on a heavy blocco); re-assert the snapshot payload budget with all final fields; measure the **asset** impact of Phase 13 (the Hanken Grotesk faces and the `@radix-ui/react-popover`, `@radix-ui/react-dropdown-menu`, `@tiptap/suggestion` additions) against the budget; verify the client honours the §10-API_CONTRACT cadences and the ETag short-circuits (request-count assertions in e2e).
7. **Regression consolidation:** the six `TESTING.md` §5 flows stable and fast enough to run on every push (parallelized; flake-free across three consecutive full runs).
8. **Verify, commit, handoff.**

## Verification

- All quality gates green (`TESTING.md` §8), including the consolidated e2e suite three times consecutively without flakes.
- Axe: zero violations on every principal screen at default and narrow widths, in both light and dark themes.
- Keyboard-only: every flow completable; focus never trapped or lost; all dialogs `Esc`-dismissable.
- Measured numbers (render, filter latency, payload size, request counts per minute idle) recorded in the handoff against their budgets.

## Constraints

- **No new features, no scope negotiation** — anything discovered that is missing behaviour goes to the handoff as a blocker or explicit deferral, not into this session's diff.
- Fixes must not fork styles outside the token system or add locale strings outside the catalog.
- Do not weaken tests to pass audits; a genuinely wrong test is fixed with its reasoning recorded.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_11.md` from the template. In *Carry-over*: the measured budget numbers, the deviation/deferral list, flake fixes applied to e2e, and the reminder that **Phase 12 requires the operator's `DEPLOYMENT.md` §2 onboarding done** — flag it now so the operator can prepare before the next session.
