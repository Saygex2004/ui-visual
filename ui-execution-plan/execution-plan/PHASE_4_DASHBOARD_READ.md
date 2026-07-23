# Phase 4 — Dashboard Read Path (Landing, Clusters, Tables at Scale)

> Goal: the core browsing surface — landing screen, both area views, cluster navigation and bucket tabs, the virtualized data tables with the full toolbar, sorting, occupancy indicators, refresh-metadata header, and the typed URL-state contract — responsive at thousands of rows, with a Hallmark pass on the table system. Optionally, a read-only live smoke against the production database. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. This phase builds what users look at most: the risk-clustered dashboard over the area snapshot the server already serves (Phase 2), behind the auth of Phase 3. The bar is the UI spec's §11: thousands of rows with instant filtering, sorting, and scrolling — and every view state deep-linkable.

**State when this phase starts:** Phases 0–3 delivered tooling, the shared package + fixtures, the snapshot cache with locked read endpoints, and the full auth layer with app shell — see `HANDOFF_PHASE_0..3.md`. The web app has login, forced-change, shell, and admin-accounts screens; no dashboard exists.

## Required reading

- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §2 (structure/navigation), §3.1 (cluster sections, bucket tabs), §4.1–§4.3 (columns, toolbar, occupancy), §10.1 (refresh metadata), §11 (cross-cutting bar)
- [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) — §2 (routing map — implement it exactly), §3 (data layer), §4 (tables), §5 (Hallmark cadence), §6 (i18n)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §3 (snapshot shape), §10 (polling contract)
- [`../specifications/DOMAIN_RULES.md`](../specifications/DOMAIN_RULES.md) — §10 (metadata mapping), §5 (the verification note this phase's live smoke serves)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §5 (flow 2), §6 (URL round-trips)

## Entry criteria

1. `HANDOFF_PHASE_3.md` outcome `complete`; all suites green at the inherited commit.
2. Seeded emulators + test credentials (earlier handoffs).

## Tasks

1. **Routing per `FRONTEND.md` §2:** `/` landing, `/aste/:area` with the full typed search-param schema (cluster, tab, geography, filters, sort) — validated, defaulted, back/forward-traversable; the workspace route (`/aste/:area/lotto/:id`) registered but rendering a placeholder panel until Phase 6.
2. **Landing screen** (*Scegli una vista*, UI §2.2) and **area view scaffolding** (UI §2.3): back control, area header with the §10.1 metadata row (via `mapRefreshMetadata` values from the snapshot; the v1.1 deferral note in place of the refresh control), cluster navigation bar with local numbering + *Archivio* entry (active state, sideways scroll), one section visible at a time.
3. **The table system** (`features/dashboard/`): one declarative table component over PrimeReact `DataTable` + `virtualScroller` with column configs per table kind (UI §4.1 show/hide matrix); occupancy indicator + label (UI §4.3); currency/dates via `Intl` `it-IT` with *N/D* fallbacks; the frozen actions column (Valutazione placeholder until Phase 6, *Vai all'annuncio →* now); header cells sticky under vertical scroll; container-only horizontal scroll.
4. **Toolbar + filter model** (UI §4.2): free-text search, the four column choosers populated from distinct values present, value range, *Reset filtri*, live visible/total count — all reading/writing the URL filter model; sorting on the four sortable columns with the shared comparators; AND-composition (geographic filters join in Phase 5).
5. **Bucket tabs** (UI §3.1) with count badges and the explanatory subtitles (Fallimenti set apart visually per the token system).
6. **Data layer wiring:** snapshot query with ETag-aware polling (~60 s + refocus), the snapshot⋈ratings join selector prepared (ratings arrive in Phase 6 — empty map for now).
7. **Hallmark pass** on the dashboard surface (tables, toolbar, tabs, navigation, header) per `FRONTEND.md` §5 — structure and component voice, tokens only.
8. **Performance validation:** load the 10k synthetic snapshot (Phase 2's generator) through the real UI; measure initial render, filter keystroke latency, sort, and scroll; fix until fluid (UI §11's "no multi-second stalls").
9. **Optional live read smoke** (operator-gated): with a **read-only** service-account key provided by the operator, point a local server at the production database, load both areas, and record: real counts vs `meta`, any region spellings falling to Black Zone, any `cod_tipo_registro`/rito observations relevant to `DOMAIN_RULES.md` §5's verification note. **Read-only, one session, no writes of any kind** (the server has no Part A write path by construction — keep it that way).
10. **e2e + unit:** Playwright flow 2 (browse + deep link) and the `TESTING.md` §6 URL round-trips.
11. **Verify, commit, handoff.**

## Verification

- All suites green; lint/typecheck/build green.
- With the seeded emulator: both areas render; cluster counts match the snapshot; the toolbar narrows the live count correctly; sorts follow the null rules; a fully-parameterized deep link opened in a fresh browser context reproduces the exact view (cluster, tab, filters, sort, scroll target reachable); back/forward walks the history of views.
- The 10k synthetic set: measured numbers recorded in the handoff; no interaction over ~100 ms of blocking work in the profile.
- i18n: zero literal strings (lint green); every new key exists in `it`.
- If the live smoke ran: findings recorded (counts, spellings, code observations) and — if the exclusion encoding needs amending — recorded per the compliance rule, not silently patched.

## Constraints

- **Tables never paginate** — virtualization only (the UI spec has no pages).
- **No client-side Firestore.** The SPA speaks only to `apps/server`.
- The workspace and rating cell are placeholders; resist reaching into Phase 6's scope.
- The live smoke is optional, operator-gated, and strictly read-only; without the key, the phase completes on emulator data alone.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_4.md` from the template. In *Carry-over*: the performance numbers and any virtualization tuning, the filter-model schema location, whether the live smoke ran and what it found (especially anything touching `DOMAIN_RULES.md` §5), and the note that **Phase 5 completes the geographic filters that this phase's filter model already reserves keys for**.
