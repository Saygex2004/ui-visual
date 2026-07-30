# Testing — Strategy, Catalogs, Quality Gates

> Companion document to [`SPECIFICATIONS.md`](SPECIFICATIONS.md), expanding §17. The strategy in one line: **domain rules exhaustively offline; server modules against the emulators; flows end-to-end with Playwright; production untouched.** The Execution Plan's verification gates reference the section numbers below.

## 1. Philosophy and ground rules

- **Offline by default.** `pnpm test` runs with no network and no emulator (pure unit suites). Integration suites require the Firestore/Storage emulators and are a separate script (`pnpm test:integration`); they refuse to run unless `FIRESTORE_EMULATOR_HOST` is set — a hard guard against ever touching production from a test.
- **Fixtures are the shared vocabulary.** One fixture dataset (`seed/fixtures/`) drives unit tests, emulator seeds, e2e runs, and the dev environment — realistic Italian listings covering every edge the rules branch on (§2). Tests never fabricate ad-hoc listings inline when a fixture case exists.
- **Test the contract, not the library.** No tests of Radix/Fastify internals; tests assert this project's rules, shapes, and flows.
- Honest reporting: a failing check is recorded as failing in the phase handoff, never skipped into green.

## 2. Unit — domain rules (`packages/shared`)

The `DOMAIN_RULES.md` catalog, case by case:

- **Area/cluster assignment:** each of the 20 regions → its cluster; null region → Black Zone; unrecognized spelling → Black Zone; corporate routing by `cod_tipo_categ_lotto` incl. the defensive default.
- **Exclusions:** every code of the §5 set excluded; null/unknown rito never excluded; corporate never evaluated.
- **Bucket split:** `FALL`/`NFAL` → Fallimenti; null/other → Principali.
- **Blocco:** four-field key match groups; any-null never groups; count spans clusters within the area; archived listings not counted.
- **Price bands:** boundary values (99 999.99 / 100 000 / 400 000 / 400 000.01), `0` (a value — Bassa), `null` (Media).
- **Sorting comparators:** nulls-lowest value sort; chronological date sort with nulls; blocco-identity sort adjacency.
- **Diversification:** round-robin spread across cells; pool smaller than target; determinism under a fixed seed; never draws ineligible fixtures.
- **Same-session rule:** past / today / future / null `data_vendita`.
- **OMI selection:** province → capital comune document; listing comune fallback to capital; error-doc and absent-doc both "not available".
- **Schemas:** every Part A fixture parses; unknown extra fields tolerated; every Part B schema round-trips.

## 3. Integration — server modules (emulator)

Seeded from the fixture set; per module:

- **Repositories:** Part A reads (active/archived by scope, omi map, meta, runs, settings) return parsed shapes; **the repository layer exports no write function for Part A collections** (asserted structurally: the module's public surface is enumerated in a test).
- **Snapshot cache:** builds classified snapshot from seed; serves without further reads (emulator request counting); `meta` change → rebuild picks up new/archived/re-activated listings and records `listing_archived`/`listing_reactivated` activity; scope isolation; descrizione trimmed; version/ETag changes exactly when content does.
- **Auth:** bootstrap on empty `users`; login/logout; wrong password vs unknown user (identical error); disabled refusal + immediate session revocation; forced password change gate on every other route; last-admin protections; username uniqueness under concurrent creates.
- **Ratings:** set/change/clear; tombstones in `since` deltas; completion recorded once and permanent; activity events appended.
- **Chat:** open-joins + read state; unread counter arithmetic across send/read/add-participant/close/reopen (the transactional invariants — assert final counter equals recomputed truth); closed-thread write refusals; sanitizer — allowed nodes survive, unknown nodes/marks stripped, `javascript:` links dropped, plain URLs linkified; attachment-only messages.
- **Attachments:** size/type refusals; metadata + blob written; signed URL requires thread access; orphan sweep.
- **Calendar:** transactional first-open (two concurrent requests → one assignment set, both read it); frozen days; eligibility (excluded/completed/assigned/corporate never drawn); admin random additive without duplicates; removal severs link only; by-id skips-and-reports.
- **Admin:** categories round-trip (`updated_by` set; absent doc → default selection presented as such); lifecycle actions produce `admin_events` and session revocations.

## 4. API tests (Fastify injection)

Route-level, over the same emulator bed: authn/authz on every route (401 anonymous, 403 role, the must-change gate); Zod validation errors → the envelope with correct keys; ETag/304 behaviour on the §10-API_CONTRACT poll endpoints; **snapshot payload budget** — the full-size synthetic fixture (10k listings) serializes under the budget and within a latency bound.

## 5. End-to-end (Playwright)

Against the full stack on emulators, seeded; the critical flows:

1. Bootstrap → admin creates a user → forced password change → sign-in lands on requested URL.
2. Browse: landing → area → cluster → filters → deep-link URL reproduces the exact view in a fresh context.
3. Two-browser collaboration: user A rates, user B sees it without reload; A opens chat from the quick action, sends rich text + attachment; B's badge increments on every screen, opens thread, unread clears; admin closes → compose gone, reopen restores.
4. Calendar: first open of today assigns 18 diversified; reopen identical; rating marks progress; admin assigns by id incl. a corporate listing.
5. Archive: past-sale rows move on *Aggiorna alla data odierna*; *Svuota archivio* clears only session moves; archived row still ratable.
6. A11y smoke: axe checks on each principal screen; keyboard-only pass through login → rate → chat.

## 6. Frontend unit

Vitest + Testing Library where logic warrants it: URL⇄filter-model round-trips, the snapshot⋈ratings join selector, i18n completeness (every key referenced exists in `it`; build fails on missing), rich-text renderer against sanitizer fixtures.

## 7. Fixture inventory

`seed/fixtures/` (JSON, one file per collection): several hundred listings spanning — all 5 clusters + both corporate categories; all 6 occupancy labels; all exclusion codes; blocchi spanning clusters (incl. a 2-lot and a 5-lot); null geography; null dates; null and zero `valore_richiesto`; archived and active; a `descrizione` with HTML-hostile characters. `omi_prices` incl. an error doc and a missing-comune gap; the three `meta` docs; a few `runs`; users covering both roles; threads (open/closed) with rich-text and attachment messages; calendar days; activity trails. A `seed/seed.ts` script loads it all into the emulators; e2e and dev use exactly this data.

## 8. Quality gates (CI, every push)

1. `pnpm lint` (ESLint + Prettier check + i18n literal rule) — clean.
2. `pnpm typecheck` — clean, all packages.
3. `pnpm test` (offline unit) — green.
4. `pnpm test:integration` (emulators in CI) — green.
5. `pnpm build` (both apps) — clean.
6. e2e suite — green on the phases that have UI (from Phase 4 on).

A phase's verification gate in the Execution Plan is these six plus its own phase-specific checks.
