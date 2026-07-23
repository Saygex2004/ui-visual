# Phase 5 — Drill-down, OMI Panel, Blocco, Archive, Categories Admin

> Goal: complete both areas' browsing behaviour — geographic drill-down with the OMI price panel, blocco isolation and cross-cluster jumps, the Archivio section with same-session past-sale handling and the guarded *Svuota archivio*, and the extraction-categories admin screen (the one write to the scraper's side of the database). Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. The dashboard's tables, toolbar, and URL state exist (Phase 4); this phase adds the geographic dimension (region → capital/province, with official OMI €/m² context), the blocco behaviours that make multi-lot proceedings navigable, and the archive semantics — including the rule that **permanently archived listings are structurally untouchable** (no API operation deletes or hides a listing; *Svuota archivio* clears client-side session moves only).

**State when this phase starts:** Phases 0–4 delivered everything through the browsable dashboard with filters/sort/deep links — see `HANDOFF_PHASE_0..4.md`. The filter model reserves `regione`/`capoluogo`/`provincia`/`blocco` keys; the OMI map is already in the immobili snapshot; the admin categories link is a placeholder.

## Required reading

- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §3.2 (drill-down), §3.3 (price panel), §4.4 (blocco), §8.2 (extraction categories), §9 (archive, *Aggiorna alla data odierna*, *Svuota archivio*)
- [`../specifications/DOMAIN_RULES.md`](../specifications/DOMAIN_RULES.md) — §6 (blocco), §9 (OMI display rules), §11 (same-session rule), Appendix A (catalog + unrecognized-group rule)
- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — §4 (omi_prices semantics), §7 (the settings write contract)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §8 (categories + runs routes)
- [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md) — §14 (archive semantics, application side)

## Entry criteria

1. `HANDOFF_PHASE_4.md` outcome `complete`; all suites green at the inherited commit.

## Tasks

1. **Geographic drill-down** (UI §3.2): region chips per cluster (populated from that cluster's actual listings), the capital/province panel (mutually exclusive selections; provinces list built from the region's listings), cluster-wide AND-composition with the Phase 4 filter model, *Tutte le regioni* reset — all in URL state.
2. **OMI price panel** (UI §3.3): on province selection, render via `selectOmiEntry` (`DOMAIN_RULES.md` §9 — the capital comune's document; comune-level when a capital is selected): €/m² range, `tipologia`/`stato`, zone + source + `semestre` caption, and the **always-residential caveat**; the unavailable state for error-doc/absent-doc alike.
3. **Blocco behaviours** (UI §4.4): the lot-count badge (from the snapshot's `blocco_index`), click-to-isolate within the current table (URL `blocco` key; *Reset filtri* clears it), the beside-badge jump control when the block continues elsewhere — switching cluster and tab, isolating, and scrolling into view; the multi-cluster chooser when it spans several.
4. **Archivio** (UI §9.1): the per-area archive section from the snapshot's archive rows (Cluster-of-origin column, own toolbar subset: search, value range, reset, sorting), empty state.
5. **Same-session past-sale handling** (UI §9.2 + `DOMAIN_RULES.md` §11): the *Aggiorna alla data odierna* header control and its automatic on-load run — client state only (`isPastSale` with the viewer's date; null `data_vendita` never moves); the moved-count report; **Svuota archivio** (UI §9.3) clearing only session moves, with the nothing-to-clear message and the confirmation stating the counts and that withdrawn listings remain. No server call exists for either — assert that nothing is written.
6. **Extraction-categories admin screen** (UI §8.2, `features/admin/`): the four catalog groups as grouped checkboxes (+ the checked, non-uncheckable *unrecognized* fifth group when unknown codes are observed in the snapshot), current selection loaded via `GET /admin/categories` (absent doc presented as the default set), save via `PUT` writing `settings/extraction_categories` with `updated_by` (`modules/settings/` write side — **the only Part A write in the codebase**, admin-role-gated), and the two mandated statements (applies at next refresh / does not shorten a run; deselected listings archived, not deleted). Wire the Phase 3 placeholder link. Add the admin **runs** view (`GET /admin/runs`, display-only) on the admin activity screen.
7. **Integration + e2e:** the `TESTING.md` §3 categories round-trip and §5 flow 5 (archive), plus e2e coverage of drill-down → OMI panel and a cross-cluster blocco jump on fixture data built for it.
8. **Verify, commit, handoff.**

## Verification

- All suites green; lint/typecheck/build green.
- Fixture walk: region → provinces appear → province shows the capital's OMI panel with caption and caveat; a province with an error doc shows the unavailable state; capital vs province selections exclude each other.
- Blocco: isolating shows exactly the block's rows; the jump lands on the right cluster/tab with the block isolated and visible; multi-cluster chooser lists the right names.
- Archive: a fixture row with yesterday's `data_vendita` moves on load and via the control (count reported); *Svuota* clears it and only it; a permanently archived fixture row is present before and after every operation; the emulator's `listings` collection is **byte-identical** before/after the archive flows (asserted in the integration test).
- Categories: save → emulator document has `codes`, `updated_at`, `updated_by` = the acting admin id; re-open shows the saved selection; `admin_events` records the change.

## Constraints

- **The settings write is the only Part A write, ever** — it goes through its own repository function, admin-gated, and the structural read-only test is extended to name it as the single exception.
- Same-session archive state is client-only; do not persist it "for convenience".
- OMI figures are always captioned with comune + residential reference — never presented as the listing's own valuation.
- The catalog and exclusion constants stay in `packages/shared`; the admin screen renders them, never redefines them.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_5.md` from the template. In *Carry-over*: the fixture cases built for blocco jumps and archive flows (later regression relies on them), the categories round-trip commands, and the note that **Phase 6 replaces the Valutazione placeholder** and will extend `GET /listings/:id` with live rating/thread facts.
