# Phase 2 — Firestore Repositories, Emulator Seed, Snapshot Cache

> Goal: the server's data core — Admin-SDK repositories with a structurally read-only Part A, the emulator seed script, and the quota-protecting snapshot cache with `meta`-driven invalidation — verified by the emulator integration suite. No UI, no auth yet, no production access. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. This phase is the system's **cost-and-safety core**: the snapshot cache is what makes a thousands-of-rows dashboard affordable on Firestore (reads collapse to a handful of `meta` polls per minute), and the read-only repository layer is what makes the scraper's data physically safe from this codebase. `packages/shared` (Phase 1) already holds every schema and rule; this phase wires them to real (emulated) Firestore.

**State when this phase starts:** Phases 0–1 delivered the skeleton and the complete shared package with fixtures — see `HANDOFF_PHASE_0..1.md`. `apps/server` has config, logging, error envelope, and health stubs only.

## Required reading

- [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md) — §8 (the caching/quota design this phase implements), §2 (module boundaries)
- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — §1 (ownership/read-only law), §8 (guaranteed read patterns), §16 (indexes)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §3 (snapshot + listing endpoints), §1 (ETag/304), §9 (`/readyz`)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §3 (repositories, cache), §4 (payload budget), §1 (emulator guard)
- [`../specifications/CONFIGURATION.md`](../specifications/CONFIGURATION.md) — §2 (`META_POLL_SECONDS`, `SNAPSHOT_MAX_AGE_HOURS`), §3 (emulator variables)

## Entry criteria

1. `HANDOFF_PHASE_1.md` outcome `complete`; offline suite green at the inherited commit.
2. `pnpm emulators` starts the Firestore and Storage emulators (command in `HANDOFF_PHASE_0.md`).

## Tasks

1. **Seed script** (`seed/seed.ts`): loads every fixture collection into the Firestore emulator; idempotent (wipe-and-load); refuses to run unless `FIRESTORE_EMULATOR_HOST` is set. Root script `pnpm seed`.
2. **Repositories** (`apps/server/src/repositories/`), one module per collection, every read parsed through the shared schemas:
   - Part A: `listings` (active/archived by scope), `omiPrices` (full map), `meta` (three docs), `runs` (recent), `settings` (read). **Exports are read functions only** — the module surface contains no create/update/delete for Part A, and the settings *write* arrives only in Phase 5's admin task.
   - Part B repositories are created by their owning phases; this phase establishes only the shared Firestore client/plugin.
3. **Snapshot cache** (`apps/server/src/cache/`): per `SPECIFICATIONS.md` §8 — build(scope): read active + archived sets, classify via `packages/shared` (`classifyListing`, `groupBlocchi`), trim `descrizione` to the excerpt, assemble the `AreaSnapshot` (version = build id, `meta` block per `mapRefreshMetadata`, `blocco_index`, `omi_by_comune` for immobili); serve from memory; **meta poller** on `PVPDASH_META_POLL_SECONDS` triggering rebuilds on `last_success_at`/`fetched_at` change, plus the `SNAPSHOT_MAX_AGE_HOURS` safety rebuild; on rebuild, diff archived/active membership and append `listing_archived`/`listing_reactivated` events to `listing_activity` (the one Part B write this phase owns).
4. **Listings module** (`modules/listings/`): `GET /areas/:area/snapshot` (ETag/304 on version) and `GET /listings/:id` (full document + classification + blocco siblings + OMI context via `selectOmiEntry` + placeholder nulls for rating/thread facts that later phases fill). `/readyz` now reports ready only when both scopes' snapshots are primed.
5. **Integration suite** (`TESTING.md` §3 repositories + cache): seeded-emulator tests including — snapshot served with **zero further Firestore reads** (count via emulator request logging or a counting wrapper), `meta` change → rebuild reflects new/archived/re-activated listings and writes the activity events, scope isolation, trimmed excerpts, ETag stability/change, Part A read-only surface asserted structurally.
6. **Payload-budget test** (`TESTING.md` §4): generate the 10k-listing synthetic set from fixture templates; assert gzipped snapshot size under the `API_CONTRACT.md` §3 budget and serialization latency within bound; record the numbers.
7. **Verify, commit, handoff.**

## Verification

- `pnpm test` (offline) and `pnpm test:integration` (emulator) both green; lint/typecheck/build green.
- With emulators seeded: `GET /api/areas/immobili/snapshot` returns a snapshot whose cluster counts match hand-counted fixture expectations (assert exact numbers in a test); a re-request with `If-None-Match` returns `304`; editing a `meta` doc in the emulator and waiting one poll interval changes the version.
- `GET /api/listings/<fixture id>` returns full `descrizione` and correct blocco siblings.
- The integration suite fails fast (refuses to run) when `FIRESTORE_EMULATOR_HOST` is unset.
- Payload-budget numbers recorded in the handoff.

## Constraints

- **No production Firestore access** — this entire phase runs against the emulator; the integration-suite guard is itself a deliverable.
- **No write path for Part A** may exist after this phase, in any module (`00_OVERVIEW.md` §5); the structural test guards it from now on.
- The cache is in-process by design (`max-instances = 1` in production); do not add Redis or cross-instance coordination — the scaling seam is documented future work (`SPECIFICATIONS.md` §19).
- No auth yet: routes are open in this phase and locked in Phase 3 — do not invent an interim scheme.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_2.md` from the template. In *Carry-over*: emulator ports and env vars, the seed command and what seeded state looks like (counts per collection), the snapshot version semantics, the measured payload numbers, and the note that **Phase 3 locks every route behind sessions** and will need the seeded users fixture.
