# Handoff — Phase 2: Firestore Repositories, Emulator Seed, Snapshot Cache

- **Phase:** 2 — Repository Firestore, Seed emulatore, Snapshot cache
- **Date:** 2026-07-24
- **Outcome:** complete

**Branch:** `phase-2-repository-cache` (off `main` at `91a5372`, the Phase 1 commit). Not yet merged — merge/PR is the operator's call.

## 1. Completed

1. **Firestore client** (`apps/server/src/firestore.ts`): `getDb(projectId)` — singleton `firebase-admin` client; routes to the emulator automatically when `FIRESTORE_EMULATOR_HOST` is set (the Admin SDK's own behaviour); no production credentials anywhere in this phase.
2. **Seed** (`seed/`) — split into a reusable library and a thin CLI so the integration suite and `pnpm seed` share one code path:
   - `seed/lib.ts`: `connectDb`, `wipeAll` (recursive delete over all 14 top-level collections, subcollections included), `seedAll` (loads every fixture collection, converting ISO strings → Firestore `Timestamp` on every instant field, `chat_threads/{id}/messages` and `/reads` written as real subcollections).
   - `seed/seed.ts`: CLI — refuses to run without `FIRESTORE_EMULATOR_HOST`, calls the library, prints counts. Root script `pnpm seed`.
   - `seed/` is now its own pnpm workspace package (`@pvp/seed`), exporting the library so `apps/server` can depend on it (`workspace:*`, devDependency) for integration-test seeding — no fragile cross-app relative imports.
3. **Repositories** (`apps/server/src/repositories/`), Part A read-only, one module per collection, every read parsed through `@pvp/shared` schemas after a `firestoreToPlain` Timestamp→ISO normalization (`convert.ts`):
   - `listings.ts` — `getByScope` (active/archived partition), `getActiveByScope`, `getArchivedByScope`, `getById`.
   - `omiPrices.ts` — `getAllBySlug`. `meta.ts` — `getScopeMeta`, `getOmiMeta`. `runs.ts` — `getRecent`. `settings.ts` — `getExtractionCategories` (read only; the write arrives in Phase 5).
   - `activity.ts` — the **one Part B write** this phase owns: `appendEvent` for `listing_activity` (used only by the cache's archived/reactivated diff).
   - No create/update/delete function exists anywhere in the Part A modules — asserted structurally in the integration suite (enumerates every export, fails on anything named like a write).
4. **Snapshot cache** (`apps/server/src/cache/`):
   - `build.ts` — split into **`assembleSnapshot`** (pure: in-memory listings/OMI/meta → `AreaSnapshot`, zero I/O) and **`buildSnapshot`** (I/O wrapper: fetch via repositories, then `assembleSnapshot`). The split exists specifically so the payload-budget test can drive 10k synthetic listings without touching Firestore.
   - `rows.ts` — `toListingRow` (descrizione trimmed to 200 chars, band/blocco_key computed), `toOmiEntry` (`available = error === null`).
   - `cache.ts` — the `SnapshotCache` class: in-process, one instance, `max-instances=1` by design (no Redis, no cross-instance coordination). `init()` primes both scopes; `get(scope)` is a pure synchronous in-memory lookup (zero Firestore reads, verified by spy-based test); `rebuild(scope)` diffs the previous build's active/archived id sets against the new one and appends `listing_archived`/`listing_reactivated` activity events for every observed transition; `poll()` re-reads the three `meta` documents, rebuilds only the scope(s) whose invalidation signal changed (`immobili`/`corporate` `last_success_at`, or `omi.fetched_at` — which also triggers an `immobili` rebuild), plus the `SNAPSHOT_MAX_AGE_HOURS` safety rebuild; a rebuild failure logs and keeps serving the last good cache (never throws through to the poller). `siblingsFor`/`selectOmi` serve the listing-detail path from the same in-memory state (no extra reads).
5. **Listings module** (`apps/server/src/modules/listings/`):
   - `GET /api/areas/:area/snapshot` — slug→scope via `AREA_SLUG_TO_SCOPE`; ETag = `snapshot.version`; matching `If-None-Match` → **304 with an explicitly empty body** (see gotcha below); unknown slug → 404 envelope.
   - `GET /api/listings/:id` — one targeted `listings` doc read (full, untrimmed `descrizione`) + classification via `classifyListing` + blocco siblings from the cache's in-memory index + OMI via `cache.selectOmi` (immobili only) + `rating`/`thread` **placeholder nulls** (Phase 6/7 fill these) — response validated against `ListingDetailSchema.parse` before send. 404 for an unknown id.
   - Both routes are registered under Fastify's `/api` prefix. **No auth** — open routes in this phase, as specified (Phase 3 locks everything down).
   - `/readyz` (health module, extended) now takes an `isReady` callback; wired to `cache.isReady()` when a data layer is present, defaults to always-ready when absent (preserves the Phase 0 stub for pure offline tests).
   - `buildApp(config, db?)` now returns `{ app, cache }`; `cache` is `null` when built without a `db` (offline unit tests stay Firestore-free). `apps/server/src/index.ts` connects `db` via `getDb()` before calling `buildApp`.
6. **Integration suite** (`apps/server/src/**/*.integration.test.ts`, guarded by `vitest.integration.config.ts` which **throws at config-load time** if `FIRESTORE_EMULATOR_HOST` is unset — refuses before a single test collects): **28 tests, all green**, three files:
   - `repositories/repositories.integration.test.ts` — the structural read-only guard, plus real reads against seeded data (exact counts, HTML-hostile descrizione intact, unknown-id → null).
   - `cache/cache.integration.test.ts` — exact hand-counted cluster/bucket membership per cluster (matches the Phase 1 fixture design precisely, see below), scope isolation, zero-further-reads (spy-based), and the meta-change rebuild path: archiving 1006 + bumping `meta/immobili.last_success_at` → `poll()` rebuilds immobili, the listing leaves its cluster and enters `archive`, and exactly one `listing_archived` event lands in Firestore (`actor_id: null`); the mirror test reactivates 1050 and asserts `listing_reactivated`; a same-content rebuild leaves `version` unchanged, a real content change moves it; a corporate-only meta bump never touches the immobili snapshot. **This file reseeds before every single test** (`beforeEach`, not `beforeAll`) because it mutates shared fixture documents — a `beforeAll` would have let one test's mutation leak into the next test's assumptions.
   - `modules/listings/listings.integration.test.ts` — HTTP-level via `app.inject`: exact snapshot cluster totals, ETag/304 round-trip, stale-ETag → 200, unknown area → 404, listing detail (untrimmed descrizione, classification, null rating/thread, null blocco for an ungrouped listing), blocco siblings across 4 clusters for the 5-lot fixture group, unknown id → 404, OMI resolved for a comune with data / null for corporate.
   - Root `pnpm test:integration` wraps the whole recursive run in `firebase emulators:exec` — verified end-to-end (emulators start seeded-fresh, all 28 pass, clean shutdown).
7. **Payload-budget test** (`apps/server/src/cache/payloadBudget.test.ts`) — deliberately an **offline unit test**, not an integration test (see Notes): generates 10k synthetic `Listing` objects (seeded/deterministic, realistic field distribution — all 20 regions + Black Zone cases, exclusion/fallimenti/principali rito mix, ~15% in blocco groups of ~3, ~4% archived, realistic-length `descrizione`) and feeds them straight into `assembleSnapshot`. **Measured numbers** (fixed seed `payload-budget-fixed-seed`, 10 000 listings → 9 600 active / 400 archived):

   | Metric | Measured | Budget (API_CONTRACT.md §3) | Headroom |
   |---|---|---|---|
   | Gzipped snapshot size | **0.37 MB** | ≤ ~3 MB | ~8× |
   | JSON.stringify latency | **72.5 ms** | ≤ 500 ms (no exact figure specified; a generous ceiling chosen here) | ~7× |
   | Raw (uncompressed) JSON | 7.36 MB | — | — |
   | `assembleSnapshot` (classify+group+trim) | 178 ms | — | — |
   | `blocco_index` entries | 9 567 | — | see Notes |

### Verification results (actual)

- `pnpm lint`, `pnpm typecheck`, `pnpm build` — green.
- `pnpm test` (offline) — green, **106 tests** (93 `@pvp/shared` + 11 `@pvp/server` + 2 `@pvp/web`).
- `pnpm test:integration` (root, `firebase emulators:exec` wrapper) — green, **28 tests** in `apps/server`; the three other workspace packages have documented no-op placeholders (`@pvp/shared`, `@pvp/web` have no integration surface yet; `@pvp/seed` is exercised *by* the server suite, not separately).
- `GET /api/areas/immobili/snapshot` cluster counts match hand-counted fixture expectations exactly (verified twice: once manually against a running server + curl, once in the automated suite) — Red 2/3, Blue Chip 6/1, Green 2/0, Grey 2/0, Black 3/0 (principali/fallimenti), `excluded_by_rules: 8`, archive `[1050, 1051]`, blocco_index has exactly one count-2 and one count-5 entry.
- `If-None-Match` round-trip: 304 with an empty body confirmed at the HTTP layer.
- `GET /api/listings/1055` returns the full untrimmed HTML-hostile descrizione; `GET /api/listings/1030` returns 4 blocco siblings spanning `blue_chip`/`red`/`grey`/`black`.
- Integration suite refuses to run without `FIRESTORE_EMULATOR_HOST` (confirmed: throws at config load, non-zero exit).
- `pnpm seed` is idempotent (run twice back-to-back, identical counts both times) and verified via the Admin SDK directly (Timestamps are real `Timestamp` instances, not strings; subcollections populated; HTML-hostile text intact).

## 2. Notes, observations, implementation details

- **Blocco key separator is a NUL character (` `), not a space** — inherited from Phase 1 (`packages/shared/src/domain/blocco.ts`, `KEY_SEP`). JSON.stringify escapes it correctly (` `, valid JSON) and it round-trips fine everywhere in this phase's code. **Time sink worth flagging:** verifying this end-to-end nearly went sideways because `bash`'s `$(command substitution)` silently corrupts embedded NUL bytes when captured into a shell variable — a manual `curl | node -e "JSON.parse(...)"` verification failed with "Bad control character in string literal" purely from that shell artifact, not a real bug. Writing the response to a file (`curl -o file`) and inspecting bytes with `python3`/`node` directly sidesteps it. All automated tests use `app.inject()` / real HTTP, never shell-captured JSON, so this only ever bit manual verification, never the test suite.
- **`blocco_index` includes singleton (count-1) entries** — a Phase 1 design choice ("Singletons are included; the UI decides to badge only count ≥ 2"), confirmed still true and reasonable at scale: in the 10k-listing payload test, 9 567 of ~9 600 active listings produced a blocco_index entry (most are singletons — realistic, since most real court proceedings have one lot). This does NOT threaten the payload budget today (0.37 MB vs. 3 MB), but if a future phase ever approaches the budget, pruning singleton entries from the *served* index (while keeping them for whatever internal deprecated bookkeeping, if any) is the first lever — noted for Phase 4/9, not touched here since it's in-budget and matches the Phase 1 contract.
- **304 responses need an explicit empty send.** Returning `null`/nothing from a Fastify handler after `reply.code(304)` does not automatically suppress the body — Fastify still serializes the return value. Fixed by `return reply.code(304).send();` (no args ⇒ empty body). Caught by the integration test asserting `res.body === ''`, not by manual testing (worth remembering: manual curl testing showed `HTTP 304` correctly but I never checked body bytes manually — the automated test is what actually proves this).
- **Payload-budget test is deliberately offline**, not `.integration.test.ts`, even though the phase document lists it alongside the emulator suite (task 6/7). Rationale: after splitting `assembleSnapshot` out as pure, the test needs zero Firestore access — seeding 10 000 real documents into the emulator just to measure a JSON payload's size would be slower and pointless. It runs in `pnpm test` (offline), not `pnpm test:integration`, and asserts the budget directly.
- **`SnapshotCache` constructor takes a small `Logger` interface** (`info`/`error`, pino-compatible) rather than a concrete pino type, so it stays trivially unit-testable without a real logger; `app.log` (Fastify's pino instance) satisfies it structurally.
- **Firestore Admin SDK `MetadataLookupWarning`** ("received unexpected error = All promises were rejected") appears on every emulator connection — a harmless GCP metadata-server probe that always fails off-GCP; ignorable noise, not an error, seen consistently across every manual and automated run.
- **`seed/` became its own workspace package** (`@pvp/seed`) rather than a loose script, specifically so `apps/server`'s integration tests could import `connectDb`/`wipeAll`/`seedAll` cleanly via `workspace:*` instead of a fragile relative path reaching into another app's internals. `seed/package.json` declares `test`/`test:integration`/`build` as safe no-ops (matching the Phase 0 placeholder pattern) so it participates in the root recursive gates without needing real content for those scripts.
- No conflicts with the Specifications were encountered; no Part A write path was added anywhere.

## 3. Blockers and unresolved issues

None. (The Java-runtime blocker carried from Phase 0/1 is resolved — see Phase 1 handoff; emulators run and were used extensively this phase.)

## 4. Carry-over for the next phase

- **Repo/branch:** `ui-visual`, branch **`phase-2-repository-cache`**, not yet merged to `main`. Next phase should either continue on this branch or merge first — operator's call.
- **Emulator ports** (unchanged from Phase 0): Firestore `127.0.0.1:8081`, Storage `127.0.0.1:9199`, UI `4001`; demo project id `demo-pvp-dashboard`. `pnpm emulators` (manual, long-running) or `pnpm test:integration` (root, wraps `firebase emulators:exec` — starts, runs, tears down automatically).
- **Seeding:** `FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 pnpm seed` against a running `pnpm emulators` session for manual/dev work; the integration suite seeds itself (no manual step needed for tests). Seeded counts: 35 listings, 4 omi_prices, 3 meta, 2 runs, 1 settings, 2 users, 3 ratings, 2 calendar_days, 3 assignment_index, 6 listing_activity, 2 chat_threads (3 messages, 2 reads), 1 attachment, 2 user_counters, 2 admin_events.
- **Snapshot version semantics:** `AreaSnapshot.version` is a 16-char sha1 prefix over the snapshot's content (clusters/archive/omi/blocco_index/meta), **excluding** `built_at` — so it only changes when served content actually changes, never on a no-op rebuild. It doubles as the ETag.
- **What Phase 3 inherits:** every route is currently **open** (no auth) — Phase 3 wraps everything in sessions and must not leave any route un-guarded. The seeded `users` fixture (`user-admin-1` / `user-1`) is ready for the auth flows to use. `buildApp(config, db)`'s signature and the `{ app, cache }` return shape are stable for Phase 3 to build on (it will likely add a `sessions` decoration alongside `cache`).
- **What Phase 4 inherits:** the snapshot/detail read path is complete and contract-tested; Phase 4's dashboard UI can be built directly against `GET /api/areas/:area/snapshot` and `GET /api/listings/:id` as specified. `rating`/`thread` on the detail response are placeholder nulls until Phases 6/7.
- **Commands known to work:** `pnpm seed`, `pnpm emulators`, `pnpm test:integration` (root), `pnpm --filter @pvp/server test:integration` (needs `FIRESTORE_EMULATOR_HOST` set manually, e.g. via a separately-running `pnpm emulators`).
