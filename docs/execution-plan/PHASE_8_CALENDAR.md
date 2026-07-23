# Phase 8 — Calendar and the Assignment Engine

> Goal: the work-distribution layer — the month and day views, the transactional once-per-day automatic assignment of a diversified set, permanent completion semantics, and the three admin assignment tasks (random, removal, by-id including corporate) — with the concurrency guarantee proven by test. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. The calendar hands each member a stable, deliberately varied daily set of listings to check; a rating by **anyone** completes a listing permanently and it is never assigned again. The engine's two hard properties: **assignment freezes once generated** (the calendar is history, not a live query), and **two racing first-opens of today cannot double-assign** — guaranteed by a Firestore transaction on the deterministic `{user_id}_{date}` document id.

**State when this phase starts:** Phases 0–7 delivered everything through chat; the shell's *Calendario* link and the admin assignment links are placeholders; `assignment_index` already receives completion records from ratings (Phase 6) — see `HANDOFF_PHASE_0..7.md`.

## Required reading

- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §7 (calendar), §8.3 (admin assignment)
- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — §11 (calendar_days, assignment_index)
- [`../specifications/DOMAIN_RULES.md`](../specifications/DOMAIN_RULES.md) — §8 (eligibility + diversification)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §7 (calendar + admin assignment routes)
- [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md) — §12 (the engine design)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §3 (calendar catalog), §5 (flow 4)

## Entry criteria

1. `HANDOFF_PHASE_7.md` outcome `complete`; all suites green at the inherited commit.

## Tasks

1. **Calendar repositories + module** (`modules/calendar/`): `calendar_days` and the `assignment_index` read/write per `DATA_MODEL.md` §11; `GET /calendar/:month` (badges + actionable flag computed server-side from days ⋈ ratings); `GET /calendar/day/:date` with the **transactional auto-assignment** on first open of today (create-if-absent on the deterministic id; the losing transaction reads the winner's set; past/future dates never generate), drawing via the shared `isEligibleForCalendar` + `diversifiedDraw` with `PVPDASH_CALENDAR_DAILY_TARGET`; `calendar_assigned` activity events.
2. **Admin assignment module** (under `modules/admin/`): random assignment (same engine, admin count 1–200, additive without duplicating the day, eligibility enforced); the assigned-listings listing for a user/day; removal (delete from `listing_ids` + delete non-completed `assignment_index` entries only — never the listing, never the rating; `calendar_removed` events); the by-id flow — search across id/court/municipality/region/description over both areas' snapshots with completed/area markers, assignment skipping-and-reporting nonexistent or completed ids (**the only corporate path**).
3. **Web — month view** (UI §7.1): Monday-first grid, previous/next, today marked, completed/assigned badges with the three progress states, the actionable flag, the legend, day selection.
4. **Web — day view** (UI §7.2): date heading, the live *N di M completate* progress line on the ratings poll, the day's table via the Phase 4 table system (calendar column set; internal ID column admin-only; Valutazione cell and workspace/quick-chat actions working unchanged), empty state. Route per `FRONTEND.md` §2 (`/calendario`, `/calendario/:date`).
5. **Web — admin assignment screens** (UI §8.3): the three tasks with confirmations and result reports (assigned ids, removed count, skipped-with-reason list); wire the Phase 3 placeholder links.
6. **Integration + e2e:** the `TESTING.md` §3 calendar catalog — above all the **concurrency test** (two parallel first-opens → exactly one generated set, both responses identical) and the frozen-day proof (pool changes; reopened day identical) — plus Playwright flow 4.
7. **Verify, commit, handoff.**

## Verification

- All suites green; lint/typecheck/build green.
- Seeded walk: first open of today assigns up to 18 spread across clusters and bands (assert the spread on a fixture pool built to allow it); reopening — and reopening after archiving part of the pool in the emulator — returns the identical set; a listing rated by another user shows completed and is never drawn again for anyone.
- Admin: random assignment twice for the same day adds without duplicates; removal leaves listing + rating intact (emulator-verified) and re-listing shows the row gone; by-id assigns a corporate listing (the only way one enters a calendar) and reports a completed id as skipped.
- The month badge, actionable flag, and progress line agree with the day's live rating state.

## Constraints

- **The calendar never regenerates.** No "refresh assignments" affordance exists; a frozen day with archived listings still shows them (they remain openable in the workspace) — that is specified behaviour, not a bug.
- Completion is `assignment_index.completed_at` — set once, **never cleared**, even when the rating is cleared (`DATA_MODEL.md` §11).
- Eligibility/diversification logic is imported from `packages/shared` — the module orchestrates, it does not reimplement.
- Credits/corporate listings enter calendars **only** through by-id assignment; the automatic and random engines must be provably unable to draw them.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_8.md` from the template. In *Carry-over*: the transaction pattern used and the concurrency test's shape, the assignment fixtures added, and the note that **Phase 9 is a hardening pass over every existing surface — no new features land after this point**.
