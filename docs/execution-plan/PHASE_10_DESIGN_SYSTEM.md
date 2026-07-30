# Phase 10 — Design System: Modern-Enterprise Visual Standardization + Dark Mode

> Goal: give the whole application one cohesive, professional visual language — **modern enterprise**, a clean blue/white palette, with **full dark-mode support** — driven by the **Hallmark** design skill's `redesign` flow. Every surface follows the same system: button sizing, spacing, alignment, typography, borders, corner radii, icons, colours, elevations. This phase changes **appearance**, not behaviour. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + **Radix UI** SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. Every feature exists (Phases 0–8) and PrimeReact has been removed in favour of hand-styled Radix primitives (Phase 9). The app works, but its visual language is inconsistent — surfaces were built phase by phase against a foundations-only token set, and some look under-designed. This phase makes the interface **cohesive and modern**: a single design system, applied everywhere, with a real dark mode.

**State when this phase starts:** Phases 0–9 complete with all gates green — see `HANDOFF_PHASE_0..9.md`. `theme/tokens.css` holds the Phase-0 foundations token set (light only); components are styled by hand against those tokens; there is no dark mode and no theme toggle. The Hallmark skill is installed at `.agents/skills/hallmark/` but has only ever run once (Phase 0, foundations only).

## Required reading

- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §5 (design system, tokens, the Hallmark cadence, dark mode), §7 (cross-cutting UI obligations), §6 (i18n)
- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §11 (cross-cutting UX behaviour), plus §§2–10 as the surface inventory to restyle
- The **Hallmark** skill itself: `.agents/skills/hallmark/SKILL.md` and `references/verbs/redesign.md`, `references/anti-patterns.md`, `references/slop-test.md` — this phase invokes the skill, so read how it wants to be driven
- `handoffs/HANDOFF_PHASE_0.md` — how `theme/tokens.css` was originally generated (genre/theme, OKLCH anchors, type pairing, spacing/radius/shadow scales) — the baseline this phase supersedes
- `handoffs/HANDOFF_PHASE_4.md` — the earlier Hallmark-invocation failure ("Unknown skill: hallmark") and the manual-principles fallback used; the skill must be confirmed invocable this time

## Entry criteria

1. `HANDOFF_PHASE_9.md` outcome `complete`; PrimeReact fully removed, Radix primitives in place, all gates green at the inherited commit.
2. The **Hallmark skill is confirmed invocable** in this session (`Skill({ skill: 'hallmark' })` resolves). If it does not — as happened in Phase 4 — pause and apply the manual-intervention protocol (`00_OVERVIEW.md` §7): hand the operator the exact install/registration steps, wait, verify, record; do not silently fall back to eyeballing the principles a second time.

## Design intent (from the project owner)

Modern enterprise: clean, professional, primarily a **blue and white** palette. **Full dark mode.** Every component follows the same design language so the app feels unified — deliberate attention to button sizing, spacing, alignment, typography, borders, corner radii, icons, colours, elevations. The system is enforced through tokens, not per-component ad-hoc styling.

## Tasks

1. **Hallmark readiness.** Confirm the skill is invocable; if not, resolve it via the manual-intervention protocol before any design work. Record the outcome.
2. **Foundations via Hallmark `redesign`.** Drive the skill to produce the modern-enterprise, blue/white foundations — palette (blue primary, white/neutral surfaces), type pairing, and spacing / radius / shadow / **elevation** scales — and **rewrite `apps/web/src/theme/tokens.css`** as its output. Add a **dark-mode token set** as `:root[data-theme="dark"]` overrides of the same custom properties (attribute-driven, consistent with the existing custom-property architecture and the `prefers-reduced-motion` guard already in the file). Tokens stay the single source: no raw hex/font literals in components (already lint-enforced).
3. **Theme toggle** in the user menu (`app/Shell.tsx`): light / dark, defaulting to the OS `prefers-color-scheme`, the explicit choice persisted (localStorage) and applied as `data-theme` on the document root. New i18n keys in the appropriate namespace; no hardcoded copy.
4. **Per-surface redesign passes**, applying the system consistently and running Hallmark over each principal surface: auth, dashboard (tables, toolbar, cluster sections, drill-down, OMI panel), the listing workspace (dialog, tabs, activity timeline, rating states), chat (thread, composer, *Le mie chat*), calendar (month, day), admin (accounts, categories, calendar assignment). Reconcile the per-feature `.css` files (`dashboard.css`, `dataTable.css`, `workspace.css`, `chat.css`, `calendar.css`, `admin.css`, `shell.css`, `ratings.css`, `auth.css`) to the unified language — spacing, alignment, borders, radii, elevation, focus rings, interactive states — all through tokens.
5. **Icons.** Adopt one coherent open-source icon set if the redesign needs it (e.g. Lucide, MIT) or stay with inline SVG; replace the emoji glyphs in menu items with system-consistent icons where appropriate. No commercial-license dependency, ever (the reason PrimeReact left).
6. **Light + dark verification** across every principal screen; the existing test suite stays green (this phase changes appearance, not DOM roles/text — e2e assertions change **only** where a redesign genuinely restructures the DOM, and each such change is recorded with its reason). Do not knowingly regress accessibility (keyboard operability, visible focus, reduced motion) — it is verified systematically in Phase 11, but must not be broken here, and axe should stay clean in **both** themes.
7. **Verify, commit, handoff.**

## Verification

- Hallmark's anti-slop gates pass on the principal surfaces (structural variety, no italic headers, token discipline, 8-state interactive components, mobile floors).
- A full manual visual pass in **both light and dark mode** across every principal screen — cohesive, modern-enterprise, blue/white, no under-designed or off-system surfaces.
- The theme toggle works, persists across reloads, and defaults to the OS preference; `data-theme` drives the whole app.
- All six quality gates green (`TESTING.md` §8); e2e green, with any assertion change recorded and justified.
- axe clean in both themes on the principal screens (a courtesy check here; the systematic pass is Phase 11).

## Constraints

- **Appearance, not behaviour.** No flow, route, endpoint, or interaction-model change — this is visual standardization. If a redesign appears to require a behaviour change, that is out of scope: record it for Phase 11 or later, do not fold it in.
- Blue/white modern-enterprise with full dark mode, exactly as specified; token discipline enforced (no hex/font literals in components).
- Stay within the established plain-CSS-against-tokens architecture (no Tailwind/CSS-in-JS). No commercial-licensed dependency.
- Do not weaken tests to pass an audit; a genuinely wrong test is fixed with its reasoning recorded (`00_OVERVIEW.md` §5).

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_10.md` from the template. In *Carry-over*: the final token architecture (light + dark sets, the `data-theme` mechanism), the theme-toggle location and persistence, which surfaces were restyled and any that were deliberately left for a later pass, the Hallmark invocation outcome (and the manual-intervention record if it was needed), any e2e assertion changes made and why, and the note that **Phase 11 (Hardening) is where a11y/responsive/reduced-motion/dark-mode are verified systematically** (axe wired into e2e, keyboard-only passes, both themes) — this phase must not have regressed them.
