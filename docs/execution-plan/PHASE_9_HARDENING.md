# Phase 9 — Hardening: Accessibility, Performance, Polish, Easter Eggs

> Goal: raise every existing surface to the UI spec's §11 bar — keyboard and assistive-technology operability, reduced motion, responsive behaviour, i18n completeness, performance and payload budgets re-validated, designed empty/loading/error states, the Appendix B easter eggs — closed by a full Hallmark audit and a consolidated end-to-end regression suite. No new features. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. Every feature exists (Phases 0–8). This phase is the difference between "works in the demo path" and "holds up under a keyboard-only user, a 4k-row filter, a narrow window, and a stale deploy" — an audit-and-fix session across the whole application, with the quality gates as the referee.

**State when this phase starts:** Phases 0–8 delivered the complete feature set with per-phase tests green — see `HANDOFF_PHASE_0..8.md`. Cross-cutting audits have not run; the easter eggs do not exist.

## Required reading

- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §11 (the bar), Appendix B (easter eggs), plus a full read of §§2–10 against the built app (the audit's checklist)
- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §7 (cross-cutting stances), §5 (Hallmark audit), §6 (i18n rules)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §5 (the six flows, consolidated), §6 (i18n completeness), §8 (gates)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §3 (payload budget), §10 (cadence conformance)

## Entry criteria

1. `HANDOFF_PHASE_8.md` outcome `complete`; all suites green at the inherited commit.

## Tasks

1. **Spec conformance sweep:** walk `../FUNCTIONAL_SPECIFICATIONS_UI.md` §§2–10 screen by screen against the running app; fix deviations; record any *deliberate* deviation with its rationale in the handoff (per the compliance rule).
2. **Accessibility audit + fixes** (`FRONTEND.md` §7): keyboard-only pass over every flow (login → browse → drill-down → rate → workspace → chat → calendar → admin); visible focus everywhere; roles/state for tab lists, the menu, and every dialog; labelled filters and inputs; axe checks wired into the e2e suite for each principal screen; `prefers-reduced-motion` honoured across transitions.
3. **Responsive audit:** windows down to narrow-laptop and tablet widths — headers/chip rows/toolbars wrap; tables scroll only inside their containers; body never scrolls horizontally; calendar and admin width-capped and centred; the workspace drawer usable at every width.
4. **i18n completeness:** the `TESTING.md` §6 catalog check green (every referenced key exists in `it`; build fails on missing); a manual sweep for attribute strings, `aria-label`s, and `<title>`s the lint rule cannot see; date/currency formatting via `Intl` everywhere.
5. **State sweep:** every screen's loading, empty, and error states are designed and translated (no blank panels, no raw error text, no untranslated fallback English); the offline/unreachable-server state distinguishes itself from a server refusal.
6. **Performance + payload re-validation:** re-run the 10k-row measurements of Phase 4 across the finished app (rating join, chat badge polling, workspace open on a heavy blocco); re-assert the snapshot payload budget with all final fields; verify the client honours the §10-API_CONTRACT cadences and the ETag short-circuits (request-count assertions in e2e).
7. **Easter eggs** (UI Appendix B, constants from `packages/shared`): the > €5M *Vai all'annuncio* interception dialog (proceed/dismiss, `Esc`/outside-click dismisses); the L'Aquila-province and Roccaraso dialogs with their single-action semantics (Roccaraso's action both dismisses and opens). Themed media ships bundled; both flows e2e-covered.
8. **Hallmark audit:** run the skill's `audit` verb over the principal surfaces; triage the punch list — fix what violates the token/anti-slop disciplines, record consciously-kept items.
9. **Regression consolidation:** the six `TESTING.md` §5 flows stable and fast enough to run on every push (parallelized; flake-free across three consecutive full runs).
10. **Verify, commit, handoff.**

## Verification

- All quality gates green (`TESTING.md` §8), including the consolidated e2e suite three times consecutively without flakes.
- Axe: zero violations on every principal screen at default and narrow widths.
- Keyboard-only: every flow completable; focus never trapped or lost; all dialogs `Esc`-dismissable (except where Appendix B specifies the single-action rule).
- Measured numbers (render, filter latency, payload size, request counts per minute idle) recorded in the handoff against their budgets.
- Easter eggs behave exactly per Appendix B, including the Roccaraso single-way-through.

## Constraints

- **No new features, no scope negotiation** — anything discovered that is missing behaviour goes to the handoff as a blocker or explicit deferral, not into this session's diff.
- Fixes must not fork styles outside the token system or add locale strings outside the catalog.
- Do not weaken tests to pass audits; a genuinely wrong test is fixed with its reasoning recorded.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_9.md` from the template. In *Carry-over*: the measured budget numbers, the deviation/deferral list, flake fixes applied to e2e, and the reminder that **Phase 10 requires the operator's `DEPLOYMENT.md` §2 onboarding done** — flag it now so the operator can prepare before the next session.
