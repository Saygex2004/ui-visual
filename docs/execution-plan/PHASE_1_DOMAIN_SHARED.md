# Phase 1 — Domain Model and Shared Contracts (Offline)

> Goal: build `packages/shared` in full — every Zod schema of the data model (Parts A and B), every pure domain rule, every constants module — plus the canonical fixture dataset, all verified by the complete offline unit suite. No I/O, no emulator, no UI. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database that a separate scraper project keeps current. All classification of listings (risk clusters, exclusions, buckets, blocchi, bands) happens **at read time as pure functions** — nothing is ever stored classified. This phase writes those functions and every schema **once**, in the shared package both apps import; it is the project's brain, and everything later leans on its correctness. Contracts live in `../specifications/`.

**State when this phase starts:** Phase 0 delivered the monorepo skeleton with green gates and a stub `packages/shared` — see `HANDOFF_PHASE_0.md`.

## Required reading

- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — all of it (Part A field dictionaries and semantics; Part B shapes and invariants)
- [`../specifications/DOMAIN_RULES.md`](../specifications/DOMAIN_RULES.md) — all of it (this phase implements it function by function)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §3 (`AreaSnapshot`/`ListingRow` shapes), §1 (error envelope shape)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §2 (the unit catalog this phase must satisfy), §7 (fixture inventory)

## Entry criteria

1. `HANDOFF_PHASE_0.md` outcome `complete`; all Phase 0 gates green at the inherited commit.

## Tasks

1. **Part A schemas** (`schemas/`): `Listing`, `OmiPrice`, `Meta` (both scope shapes + `omi`), `Run`, `ExtractionCategories` — exactly the `DATA_MODEL.md` Part A dictionaries: nullable fields explicit, `YYYY-MM-DD` string dates validated by shape, **unknown extra fields tolerated** (passthrough), `content_hash` present but typed as opaque.
2. **Part B schemas:** `User`, `Session`, `Rating`, `CalendarDay`, `AssignmentIndexEntry`, `ActivityEvent` (with the closed §12 vocabulary as a Zod enum), `ChatThread`, `ChatMessage`, `ReadState`, `UserCounters`, `Attachment`, `AdminEvent`.
3. **API payload schemas:** `AreaSnapshot`, `ListingRow`, `ListingDetail`, the error envelope, and the request/response bodies of `API_CONTRACT.md` §§2–8 (auth, ratings, chat, calendar, admin) — inferred types are the client's compile-time contract.
4. **Constants** (`constants/`): the five real-estate clusters with their region lists and the two credits clusters; the exclusion-code set; the Appendix A category catalog with groups and the default selection; price-band boundaries; polling cadences; the rich-text node/mark allowlist; area-slug ↔ scope mapping; easter-egg constants (threshold, province, comune).
5. **Domain functions** (`domain/`), pure and individually exported: `classifyListing` (area, cluster, bucket, excluded flag), `groupBlocchi` (area-wide, four-field key, never on nulls), `priceBand`, the three sort comparators, `isEligibleForCalendar`, `diversifiedDraw` (seedable, per `DOMAIN_RULES.md` §8), `isPastSale` (viewer-date parameter), `selectOmiEntry` (province/capital/comune per §9), and `mapRefreshMetadata` (§10 table, including the computed excluded count).
6. **Fixture dataset** (`seed/fixtures/`): the full `TESTING.md` §7 inventory as JSON — build it deliberately against the rules (every cluster, every occupancy label, every exclusion code, multi-cluster blocchi, null geography/dates/values, zero-value credits, archived rows, OMI error and gap, both roles, open/closed threads with rich-text + attachment messages, calendar days, activity trails). Canonical region spellings per `DOMAIN_RULES.md` §2.
7. **Unit suites:** the complete `TESTING.md` §2 catalog over the schemas, functions, and fixtures — including the listed boundary values and defensive defaults. Every fixture listing must parse through the Part A schemas (the dataset is itself under test).
8. **Verify, commit, handoff.**

## Verification

- `pnpm test` green with the full §2 catalog present (spot-check: Black-Zone-by-null-region, never-group-on-null-blocco-field, band boundaries, zero-value credit banding, unknown-rito-not-excluded, diversification determinism under a fixed seed).
- `pnpm lint`, `pnpm typecheck`, `pnpm build` green; `packages/shared` has **zero runtime dependencies** beyond Zod (no React, no Fastify, no firebase-admin — assert via `package.json` review).
- Fixtures load and parse in a test that round-trips every collection file through its schema.

## Constraints

- **No I/O in `packages/shared`** — no fetch, no fs at runtime (fixtures are loaded by tests/seed scripts, not by the package).
- **The rules implement `DOMAIN_RULES.md` exactly.** A rule that seems wrong is a compliance-rule case (`00_OVERVIEW.md` §5): record it, don't "fix" it — in particular the §5 verification note about `cod_tipo_registro` stays a Phase 4 observation, not a Phase 1 improvisation.
- Constants are code, not env (`CONFIGURATION.md` §5); no configuration surface grows here.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_1.md` from the template. In *Carry-over*: the fixture location and a one-paragraph inventory of what it covers (every later phase seeds from it), the exported module map of `packages/shared`, and any spec ambiguities encountered with how they were recorded.
