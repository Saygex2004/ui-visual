# Phase 6 — Listing Workspace, Shared Ratings, Activity History

> Goal: the per-listing workspace panel as the central entity surface — full details, related lots, OMI context, the activity timeline — and the collaborative rating system live end to end: immediate save, toggle-clear, row marking, polling reconciliation between concurrent users, completion recording, and activity events. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. The browsing surface is complete (Phases 4–5); this phase makes it **collaborative**: the team's shared verdict on every listing (*Ottimo affare* / *Da verificare* / *Da evitare*), and the workspace panel — a routeable side drawer — where a listing's whole story lives (details, related lots, price context, who-did-what-when history, and, from Phase 7, the chat). Ratings are collective by design: any member's rating is everyone's.

**State when this phase starts:** Phases 0–5 delivered the full read-side dashboard; the workspace route renders a placeholder, the Valutazione cell is a stub, `modules/ratings|activity` do not exist, and `GET /listings/:id` returns null rating/thread facts — see `HANDOFF_PHASE_0..5.md`.

## Required reading

- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §4.5 (the workspace, incl. activity history), §5 (ratings)
- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — §10 (ratings), §11 (completion permanence), §12 (activity events)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §3 (`ListingDetail`, activity endpoint), §4 (ratings routes + delta poll), §10 (cadences)
- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §2 (workspace route + `pannello` param), §3 (optimistic mutations, snapshot⋈ratings join)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §3 (ratings catalog), §5 (flow 3's rating half)

## Entry criteria

1. `HANDOFF_PHASE_5.md` outcome `complete`; all suites green at the inherited commit.

## Tasks

1. **Ratings module** (`modules/ratings/` + repository): `PUT`/`DELETE`/`GET ?since` per `API_CONTRACT.md` §4 — set/change/clear with `set_by`/`set_at`, tombstones in the delta window, **completion recording** into `assignment_index` on first rating (permanent — `DATA_MODEL.md` §11), and the corresponding `listing_activity` events.
2. **Activity module** (`modules/activity/` + repository): the append function (used by ratings now, chat/calendar later — Phase 2's cache already appends archival events) and `GET /listings/:id/activity` newest-first.
3. **`ListingDetail` completed:** `GET /listings/:id` now embeds the current rating and (placeholder-false until Phase 7) thread facts.
4. **Rating cell** (`features/ratings/`): the three-option Valutazione control in the frozen column — active-state marking of the whole row per verdict (token-defined treatments), same-option-again clears, optimistic apply with rollback on failure; the ~20 s ratings poll joined into the tables via the Phase 4 selector so **other users' ratings appear without reload**; the same control rendered in the workspace.
5. **The workspace panel** (`features/workspace/`): the routeable side drawer on `/aste/:area/lotto/:id` with `pannello` tabs (`dettagli` | `storico` | `chat`-placeholder): full untruncated `descrizione` and every stored fact with *N/D* fallbacks; the rating control; related blocco lots (each opening the workspace in turn); OMI context per `DOMAIN_RULES.md` §9; the activity timeline (actor, event, moment — rendered from the closed vocabulary's i18n keys). Modal-dialog semantics per `FRONTEND.md` §7 (focus trap, `Esc`, close-navigates-back preserving search params). Available from cluster tables, archive, and (Phase 8) calendar rows via the row action.
6. **Hallmark pass** on the workspace surface (drawer anatomy, timeline, rating states).
7. **Integration + e2e:** the `TESTING.md` §3 ratings catalog (incl. completion permanence when a rating is cleared) and a two-context Playwright test: user A rates → user B sees row marking within one poll; B clears → A sees unrated; the timeline shows both actions attributed.
8. **Verify, commit, handoff.**

## Verification

- All suites green; lint/typecheck/build green.
- Two-browser walk on the seeded stack: rating convergence both directions within the poll cadence; exactly one rating active at a time; clearing returns the unmarked row; the archive and cluster rows behave identically.
- Workspace deep link `/aste/immobili/lotto/<id>?pannello=storico` opens the drawer on the timeline in a fresh context; closing returns to the same filtered table.
- Emulator state after a set-then-clear: `ratings` doc absent, `assignment_index` completion present, activity shows `rating_set` + `rating_cleared`.

## Constraints

- **Ratings are last-write-wins and collective** — no per-user ratings, no comment field (discussion is Phase 7's chat), no confirmation dialogs on rating.
- Activity events are **append-only** and use only the closed vocabulary (`DATA_MODEL.md` §12); needing a new type is a compliance-rule note, not an ad-hoc string.
- The workspace fetches detail on open (`GET /listings/:id`) — the snapshot stays trimmed; no full descriptions ride the area payload.
- The chat tab stays a placeholder; do not scaffold Phase 7's modules.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_6.md` from the template. In *Carry-over*: the ratings poll wiring (query keys, cadence constants used), the activity append function's surface (Phase 7 and 8 call it), the workspace tab contract, and the note that **Phase 7 fills the chat tab and the shell's unread badge**.
