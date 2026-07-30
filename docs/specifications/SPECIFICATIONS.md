# PVP Aste Dashboard — Specifications

> The complete, self-contained specification of the **Application project** (`pvp-dashboard`): the web dashboard, and its backend, that a small investment team uses to review Italian judicial auctions. It is written for a **brand-new repository**: every technical fact needed to implement it — the shared database contract, the domain classification rules, the API surface, the frontend architecture — is in this folder or its siblings. The system it reads from (a separate, already-running scraper project) is described only through its database contract; the two projects never share code and communicate **only through the shared database**.
>
> This document and its companions define **what to build**. The phase-based build workflow — **how to build it**, one self-contained phase per agent session — is the Execution Plan in [`../execution-plan/`](../execution-plan/), starting from [`00_OVERVIEW.md`](../execution-plan/00_OVERVIEW.md). The **behaviour** of the interface (screens, interactions, flows) is specified in [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md); UI-spec section references below (UI §x) point to it.

## Companion documents

This document is the decision-level overview. Seven deep-dive specifications in this folder expand specific sections to full implementation depth; the whole `specifications/` folder moves into the new repository's `docs/` unchanged:

| Document | Expands | Contents |
|---|---|---|
| [`DATA_MODEL.md`](DATA_MODEL.md) | §4 | The Firestore contract: Part A — the scraper-owned collections this application reads (field-by-field, read-only discipline); Part B — the application-owned collections (accounts, sessions, ratings, chats, attachments, calendar, activity). |
| [`DOMAIN_RULES.md`](DOMAIN_RULES.md) | §5 | The pure, in-memory classification contract: cluster taxonomy, exclusion rules, Fallimenti split, occupancy, blocco grouping, price bands, calendar diversification, OMI display rules. |
| [`API_CONTRACT.md`](API_CONTRACT.md) | §6 | The REST surface: every endpoint, its request/response shape, the error envelope, the snapshot payload, and the polling contract. |
| [`FRONTEND.md`](FRONTEND.md) | §9 | Routing map and URL-state contract, data layer and polling tiers, component architecture, table virtualization, theming and the Hallmark workflow, i18n structure. |
| [`CONFIGURATION.md`](CONFIGURATION.md) | §16 | Every setting of both apps: name, type, default, effect; the source for `.env.example`. |
| [`TESTING.md`](TESTING.md) | §17 | Test taxonomy and per-module catalogs, fixture inventory, emulator setup, e2e strategy, quality gates. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | §18 | The production topology (Firebase Hosting + Cloud Run), operator onboarding, security rules, budget controls, runbook inputs. |

## Context

Italian courts sell assets through insolvency and enforcement proceedings, published one listing at a time on the national PVP portal (*Portale delle Vendite Pubbliche*, pvp.giustizia.it). A separate, already-operational **scraper project** collects every upcoming auction daily — two scopes: `immobili` (real estate) and `corporate` (company-share quotas and assigned credits) — plus monthly official OMI price references (*Osservatorio del Mercato Immobiliare*, Agenzia delle Entrate), and keeps a shared **Cloud Firestore** database current. A pilot proved the product: a risk-clustered, collaboratively reviewed dashboard over that data. This project builds the production version of that dashboard as the second of the two independent projects.

The functional behaviour is fully specified in [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — an implementation-agnostic description of every screen and flow. This folder decides **how** that behaviour is realized.

Decisions confirmed with the project owner (2026-07):

- **Monorepo** containing frontend and backend, with a shared types/domain package.
- **Frontend:** React + TypeScript + **Radix UI** primitives (open-source, hand-styled on design tokens), built as a Vite single-page application. (Originally PrimeReact; replaced because its styled theming requires a commercial license.)
- **Backend:** **Fastify + Zod** TypeScript REST server; **all** Firestore access goes through it via the Firebase Admin SDK — the browser never talks to Firestore.
- **Database:** the existing shared Cloud Firestore (Native mode, `europe-west8`, project `pvp-aste`) — the scraper's collections are read-only for this project; see the boundary contract in `DATA_MODEL.md`.
- **Deployment:** frontend on **Firebase Hosting**, backend on **Cloud Run**, in the same Google Cloud project as the database; requires the Blaze (pay-as-you-go) plan with budget alerts.
- **Authentication:** application-managed accounts (username + password, roles `user`/`admin`), backend sessions with httpOnly cookies — not Firebase Auth (§7).
- **Approved enhancements** (now part of the UI spec): account lifecycle management (UI §8.1), rich-text chat messages with attachments (UI §6.2), per-listing activity history (UI §4.5).
- **Interactive re-fetch deferred:** the scraper runs on schedule only; the UI §10.2 trigger control is v1.1 material (future handshake sketched in §19). V1 shows refresh metadata only.
- **Internationalization from day one:** all UI copy externalized, default language Italian; no hardcoded strings anywhere.

### Lessons this design bakes in

1. **Firestore read quota is the dominant cost risk.** A whole-set page load costs ~1 read per document per user, and the dashboard renders thousands of listings; naive per-client reads or per-client Firestore listeners would multiply reads ruinously. → all listing reads are served from a **server-side snapshot cache** (§8); clients poll the backend, never the database.
2. **The pilot was a single HTML file.** It proved the product but could not be maintained, tested, or extended. → a conventional, boring, layered architecture (§2) with the domain rules in one shared, pure, unit-tested package.
3. **Classification must stay read-time.** Clusters and exclusions are a pure function of stored raw codes, applied when data is read — changing a rule takes effect on the next render, with no re-scrape and no migration. → the rules live in `packages/shared` as pure functions (`DOMAIN_RULES.md`), used identically by server and tests.
4. **The scraper's contract is load-bearing and shared.** Drifting from it breaks another running system. → `DATA_MODEL.md` Part A is copied here as read-only law; the repository layer physically has no write path to scraper-owned collections.
5. **Free text from the portal is untrusted**, and chat adds user-authored rich text. → one sanitization/rendering rule per content type, applied identically everywhere (§11), enforced server-side.

---

## 1. Language and core technology choices

**TypeScript everywhere — confirmed.** One language across frontend, backend, and the shared domain package means one toolchain, one set of conventions, and — decisively — **shared types**: the Zod schemas that validate API payloads on the server are the same objects the client compiles against. The backend is I/O-bound orchestration over Firestore (no CPU-heavy work), squarely in Node's sweet spot.

**Runtime:** current Node LTS. **Package manager:** pnpm with workspaces (§3).

| Concern | Choice | Why |
|---|---|---|
| Frontend build | **Vite** | The standard for React SPAs: instant dev server, fast production builds, no framework lock-in. |
| React framework | **Vite SPA (no SSR)** | The app sits entirely behind a login: there is nothing to SEO and no first-paint-for-anonymous-users problem, which are the reasons to buy Next.js's complexity. A static SPA also deploys trivially to Firebase Hosting. Alternative considered: Next.js (SSR machinery, server components, and hosting constraints bought for nothing here). |
| Routing | **TanStack Router** | Typed routes and — decisively — **typed, validated search params**: the deep-link requirement (UI §2.4 — area, cluster, tab, filters, workspace all restorable from the URL) is exactly its core feature. Alternative: React Router (more common, but search-param state is hand-rolled and untyped). |
| Server state | **TanStack Query** | Polling ("short recurring interval", UI §5–§6) with caching, deduplication, and background refetch; pairs naturally with the router. |
| UI components | **Radix UI** primitives (open-source) | Unstyled, accessible headless primitives (tabs, dialog) hand-styled on the project's design tokens; the thousands-of-rows requirement (UI §11) is carried by a custom virtualized table (`@tanstack/react-virtual`), not the component library. Replaced PrimeReact, whose styled theming needs a commercial license. |
| i18n | **react-i18next** | The standard React i18n stack: namespaces per feature, lazy-loadable locales, ICU-style plurals. Default and only initial locale: `it`. |
| Backend framework | **Fastify** | Fast, minimal, first-class TypeScript and schema-validation story; plugins for cookies, multipart, CORS. Alternative: NestJS (heavier DI/decorator framework — more ceremony than an app this size repays). |
| Validation | **Zod** | One schema language for API bodies, env config, and the shared domain types; schemas live in `packages/shared` and serve both sides. |
| Firestore | **firebase-admin** | Official Admin SDK: server credentials, bypasses security rules, BulkWriter for batched writes. The **only** database client in the system. |
| Attachments storage | **Firebase Storage** (via Admin SDK) | Same project, same credentials; uploads mediated by the backend, downloads via short-lived signed URLs (§11). |
| Password hashing | **argon2id** | Current OWASP recommendation for password storage. |
| Logging | **pino** | Fastify's native structured logger; JSON lines on Cloud Run, pretty console in dev; request-id on every line. |
| Rich text | **TipTap** (ProseMirror) | Constrained schema (bold, italic, lists, links — nothing else), stored as TipTap JSON, sanitized server-side; one shared render path (§11). Alternatives: plain text + linkify (rejected — approved enhancement requires rich text), Markdown (rejected — escaping pitfalls with untrusted content). |
| Tests | **Vitest**, **Playwright**, Firestore + Storage **emulators** | Vitest across all packages; Playwright for user-flow e2e; the emulator suite is the integration bed (no production access from tests, ever). |
| Lint/format | **ESLint + Prettier** | Standard; plus an i18n lint rule forbidding literal user-facing strings in JSX. |

## 2. Overall architecture

Two deployable applications and one shared library, in one repository:

```
┌────────────┐   HTTPS/JSON (REST, cookies)   ┌─────────────────┐   Admin SDK   ┌───────────────┐
│  apps/web  │ ─────────────────────────────▶ │   apps/server   │ ────────────▶ │   Firestore   │
│  Vite SPA  │ ◀───────────────────────────── │  Fastify + Zod  │ ────────────▶ │   + Storage   │
└────────────┘         polls, no push         └─────────────────┘               └───────────────┘
        └───────────── both compile against packages/shared (types, schemas, domain rules) ─────────────┘
```

- **The browser never touches Firestore or Storage.** Every read and write is an authenticated call to `apps/server`; production security rules deny all client access (§18). This single choice is what makes the quota strategy (§8), the write-protection guarantees (§14), and the session model (§7) enforceable.
- **`apps/server` is a modular monolith**: one Fastify process, one module per bounded feature (`auth`, `listings`, `ratings`, `activity`, `chat`, `attachments`, `calendar`, `admin`, `settings`), each owning its routes, service logic, and repository calls. Modules communicate through exported service functions, not HTTP.
- **`packages/shared` is dependency-free domain truth**: Zod schemas for every stored document and API payload, plus the pure classification functions of `DOMAIN_RULES.md`. It imports neither React nor Fastify nor firebase-admin; both apps and every test import it.
- **State lives in Firestore and in the URL.** The server keeps one rebuildable in-memory cache (§8) and no other state; the SPA keeps view state in the address bar per the deep-link contract (`FRONTEND.md` §2).

### Component responsibilities

| Component | Owns | Must not |
|---|---|---|
| `apps/web` | Rendering, interaction, URL state, i18n, polling cadence | Contain domain classification logic (imports it), talk to Firestore, hardcode copy |
| `apps/server` | AuthN/AuthZ, API contract, snapshot cache, all Firestore/Storage I/O, sanitization, activity recording | Write to scraper-owned collections (no code path exists), trust client-supplied roles/ids |
| `packages/shared` | Types, Zod schemas, domain rules, constants (codes, bands, labels) | Perform I/O of any kind |

## 3. Repository structure

Summary — the full target tree, and which build phase creates each part, is in [`../execution-plan/REPOSITORY_STRUCTURE.md`](../execution-plan/REPOSITORY_STRUCTURE.md):

```
pvp-dashboard/
├── docs/                    # this documentation set, moved in unchanged
├── apps/
│   ├── web/                 # Vite SPA (React, Radix UI, TanStack Router/Query, react-i18next)
│   └── server/              # Fastify API (modules, repositories, cache, config)
├── packages/
│   └── shared/              # Zod schemas, domain rules, constants — pure TypeScript
├── firebase/                # firebase.json (emulators, hosting), firestore.rules, storage.rules
├── seed/                    # emulator fixtures + seed script
└── deploy/                  # server Dockerfile, deploy scripts
```

## 4. The data boundary (summary — full contract in `DATA_MODEL.md`)

The shared Firestore database has two halves:

- **Part A — scraper-owned, read-only here:** `listings` (one document per auction lot ever seen; Italian field names; `YYYY-MM-DD` string dates; `archived_at` timestamp expresses the permanent archive; never deleted), `omi_prices` (one document per *(provincia, comune)*; always a **residential** reference; explicit error markers), `meta` (three well-known documents powering the "last refreshed" headers), `runs` (the scraper's audit trail — operational curiosity only, no feature may depend on it). The one exception to "read-only" is **`settings/extraction_categories`**, the deliberate application→scraper channel this project's admin panel writes (§13).
- **Part B — application-owned:** `users`, `sessions`, `ratings`, `chat_threads` + `chat_messages` + per-user read state, `attachments`, `calendar_days`, `listing_activity`, `admin_events`. Shapes, ids, and invariants are defined in `DATA_MODEL.md` Part B and owned by this project alone.

Binding disciplines: additive tolerance (unknown fields on Part A documents must be ignored, never dropped or errored on); `content_hash` is scraper bookkeeping and must never be interpreted; the four blocco fields (`tipo_procedura`, `tribunale`, `numero`, `anno`) are load-bearing; nulls are explicit and presentation fallbacks (*N/D*) are entirely this project's job.

## 5. Domain rules at read time (summary — full contract in `DOMAIN_RULES.md`)

All classification is a **pure function of a stored listing**, computed in memory when data is served — there is no stored cluster field and no reclassification step; a rule change takes effect on the next snapshot rebuild:

- **Two areas** → real estate: five clusters by region (Red / Blue Chip / Green / Grey zones + the non-geolocated Black Zone catch-all); credits & shares: two clusters by asset type (Crediti / Partecipazioni).
- **Exclusion rules** (real estate only): ordinary real-estate enforcement (pre- and post-Cartabia), civil litigation, and tax-collection enforcement are excluded from all clusters; the excluded count is surfaced (UI §10.1).
- **Bucket split** within every cluster: *Fallimenti* = rito `FALL`/`NFAL`; everything else *Procedure principali*.
- **Blocco**, occupancy labels, price bands, and the calendar diversification algorithm — all specified as decision tables/algorithms in `DOMAIN_RULES.md` and implemented once in `packages/shared`.

## 6. API design (summary — full surface in `API_CONTRACT.md`)

- **REST-like, resource-oriented**, JSON over HTTPS, under a single `/api` prefix served by Cloud Run. No API versioning ceremony for v1 (single first-party client, deployed together); breaking changes are coordinated deploys.
- **Reads are snapshot-shaped:** one endpoint per area returns the pre-classified, pre-grouped, description-trimmed dataset the dashboard renders (§8); one endpoint returns a single listing in full (workspace). Collaboration state (ratings, unread counts, thread messages) has small, frequently-polled endpoints — the polling contract (cadences, ETag/`updated_at` short-circuits) is part of `API_CONTRACT.md`.
- **Writes are explicit and narrow:** rating set/clear, message send, thread join/close/reopen, attachment upload, calendar generate/assign/remove, account lifecycle, extraction-category selection. There is **no endpoint** that deletes or hides a listing, and none that writes any Part A collection other than `settings/extraction_categories` (§14).
- **Error envelope:** every error is `{ error: { code, key, details? } }` where `key` is an i18n message key the client resolves — the server never composes user-facing Italian prose.
- All request/response schemas are Zod schemas in `packages/shared`; the server validates every body/query against them and the client imports the inferred types.

## 7. Authentication, sessions, roles

**Application-managed sessions — confirmed.** Accounts are admin-created, username-only (no email), with a forced password change on first sign-in (UI §8.1). Firebase Auth is built around self-service email/phone identities and would force fabricated emails, custom-claims role plumbing, and a client-side Firestore posture this architecture deliberately avoids. Instead:

- `users` documents store `username`, `password_hash` (argon2id), `role` (`user` | `admin`), `disabled`, `must_change_password`, timestamps (`DATA_MODEL.md` Part B).
- **Sessions** are opaque random ids in a `sessions` collection, delivered as an **httpOnly, Secure, SameSite=Lax cookie**; long-lived (the UI requires persistence across restarts), renewed on use, revocable server-side (password change and disable end the account's other sessions immediately).
- **Bootstrap:** on startup against a database with zero users, the server creates the initial admin with a password from configuration (`CONFIGURATION.md`) — announced to the operator out-of-band, never in the UI — flagged `must_change_password`.
- **Authorization** is role-checked per route on the server (admin surface: UI §8); the client hides admin UI as a courtesy, the server enforces it as the rule. The internal listing id appears only on admin surfaces (UI §8).
- **Lifecycle guarantees** (approved enhancement): change password / change role / disable / re-enable, each confirmed, each recorded to `admin_events`, with last-active-admin protection; accounts are never deleted, so authorship stays attributed forever.

## 8. Data flow, caching, and the quota strategy

The central performance/cost design. Numbers assume the realistic scale: ~5–15k active listings per area, a team of ≤10, Blaze billing (where reads are cheap but not free — and unbounded read amplification is still a defect).

- **The snapshot cache.** At startup and on invalidation, `apps/server` reads a scope's full active + archived listing sets and the `omi_prices` and `meta` collections **once**, classifies every listing with the shared domain rules, computes blocco groups area-wide, trims `descrizione` to an excerpt, and holds the result in memory. Every dashboard read is served from this cache — cost: zero Firestore reads.
- **Invalidation by `meta` polling.** The scraper touches listings only during its scheduled runs, and every successful run updates its scope's `meta` document. The server polls the three `meta` documents on a fixed interval (default 60 s — 3 reads/minute ≈ 4.3k reads/day); a changed `last_success_at`/`fetched_at` triggers a scope re-read (~one read per document in the scope, a few times a day). This is the entire listings read bill.
- **Client polling, tiered** (the UI's "short recurring interval"): snapshot version every ~60 s (a no-op unless the server cache rebuilt); ratings + unread totals every ~20 s; an open chat thread every ~5–10 s. All of it hits the server cache and the small Part B collections; client count multiplies **server** requests, not Firestore listing reads.
- **Part B reads stay small** by design: ratings are one compact collection read scoped to changed-since timestamps; unread totals are a **single per-user counter document** updated transactionally on message send/read — never N thread reads per poll (UI §6.1's every-screen badge would otherwise be the biggest read amplifier in the system).
- **Cache coherence:** Cloud Run runs this service with `max-instances = 1` (§18) — one cache, no coordination. The snapshot rebuild is cheap (seconds) and a cold start self-heals. Scaling beyond one instance is a documented future step (§19), not a v1 concern.
- **Payload budget:** an area snapshot must stay lean — trimmed descriptions, no raw fields the UI doesn't render, gzip on the wire; the concrete budget and shape live in `API_CONTRACT.md`.

## 9. Frontend architecture (summary — full detail in `FRONTEND.md`)

- **Routing:** a REST-like, deeply-linkable URL hierarchy — area / cluster / bucket / filters in typed search params; the listing workspace, its tabs (details, history, chat), the calendar month/day, chat list and thread, and each admin screen all addressable; browser back/forward traverses view states (UI §2.4). The full route map is `FRONTEND.md` §2.
- **Data layer:** TanStack Query against the REST API with the §8 polling tiers; mutations (rating, message) apply optimistically and reconcile on the next poll.
- **Tables:** a custom virtualized table (semantic `<table>` + `@tanstack/react-virtual`) carries the thousands-of-rows requirement; filtering/sorting run over the in-memory snapshot slice; the Valutazione cell and row actions stay reachable under horizontal scroll (UI §4.1).
- **Design system:** design tokens (color, type, spacing, elevation) produced with the **Hallmark** design skill, encoded as CSS custom properties in `theme/tokens.css` and consumed directly by the hand-styled Radix components — a **modern-enterprise blue/white** language with **full dark mode** (`data-theme` token sets). Hallmark defines and enforces the system in a dedicated pass (Execution Plan Phase 10) and re-audits it during hardening (Phase 11), after earlier per-surface passes (Phases 4, 6, 7).
- **i18n:** react-i18next, default `it`, one namespace per feature, no literal strings in components (lint-enforced); dates/currency via `Intl` with the `it-IT` locale. Language switching needs no architectural change later.
- **Accessibility and responsiveness** per UI §11: keyboard operability, visible focus, ARIA roles on tabs/menus/dialogs, reduced-motion support; tables scroll inside their own container only.

## 10. Collaborative ratings and activity history

- One shared rating per listing (`ratings` collection, doc id = listing id): `value` ∈ {`ottimo_affare`, `da_verificare`, `da_evitare`}, `set_by`, `set_at`. Clearing **deletes** the document (an unrated listing stores nothing — UI §5). Last write wins; no per-user ratings.
- A rating (by anyone) marks the listing **completed** for the calendar (§12) permanently — clearing the rating does not un-complete an already-recorded completion (the calendar records completion when it observes it; see `DATA_MODEL.md` Part B).
- **Activity history** (approved enhancement): every meaningful application event on a listing — rating set/changed/cleared, thread opened/closed/reopened, attachment added, calendar assignment, archival transition observed — appends an immutable event to `listing_activity` (actor, type, moment, small details map). The workspace renders the timeline newest-first. Events are never edited or deleted; the vocabulary is closed and defined in `DATA_MODEL.md` §12 (extending it is an additive change).

## 11. Chat, rich text, attachments

- One thread per listing (`chat_threads`, doc id = listing id), messages in a subcollection, per-user read state, participant list; opening a thread joins the opener and marks it read (UI §6.2). Admin close/reopen with confirmation; a closed thread accepts no messages or participants server-side and stops counting toward unread totals.
- **Rich text:** messages are stored as **TipTap JSON constrained to the approved node set** (paragraph, bold, italic, bullet/ordered list, link). The server validates and sanitizes every incoming document against that schema — unknown marks/nodes are stripped, link protocols are allowlisted (`https`, `http`), and plain-text URLs are linkified — **one rule, applied at write time**, so every reader renders the same stored truth (UI §6.2's "identical at first display and on every sync"). The client renders through one shared read-only component.
- **Attachments:** upload is a multipart POST to the server, which enforces size/type limits (`CONFIGURATION.md`), stores the blob in Firebase Storage under a server-generated key, and writes an `attachments` metadata document. Download is a short-lived **signed URL** minted per request after an authorization check. The bucket is closed to direct client access (§18). Image attachments get an inline preview; everything gets name-and-size download (UI §6.2).
- **Unread counts:** per-user counter document maintained transactionally (§8); the capped *9+* display is client presentation.

## 12. Calendar and the assignment engine

- **Automatic assignment** (UI §7.3): the first time a user opens **today's** day view, the server assigns 18 eligible listings inside a **Firestore transaction on a deterministic document id** `calendar_days/{user_id}_{YYYY-MM-DD}` — two racing requests cannot double-assign (create-if-absent semantics; the loser reads the winner's result). Assignment then freezes: the calendar is history, never regenerated.
- **Eligibility:** active (`archived_at == null`) real-estate listings, not excluded by the §5 exclusion rules, never previously completed (rated by anyone) and never previously assigned to anyone — enforced against a completion/assignment index kept in Part B.
- **Diversification:** the assigned set spreads across regions and the three price bands (< €100k / €100k–€400k / > €400k; unknown → middle) per the algorithm in `DOMAIN_RULES.md` §8.
- **Admin assignment** (UI §8.3): random (same engine, additive, no duplicates), removal (severs the calendar link only — never touches the listing or its rating), and by-id search-and-assign (the only path for corporate listings; already-completed and nonexistent ids are skipped and reported).
- Month/day views render from `calendar_days` plus live rating state; the completed/assigned badge and the actionable flag are computed server-side into the calendar payload.

## 13. Administration

Admin-only module (server-enforced): account management with the full lifecycle (§7), the **extraction-category selection** (UI §8.2 — a grouped checkbox form over the catalog in `DOMAIN_RULES.md` Appendix A that writes `settings/extraction_categories` with `updated_by` = the acting account id; the panel states that the selection applies at the next scraper refresh, does not shorten a run, and that deselected listings are archived, not deleted), and calendar assignment (§12). Admin actions are recorded to `admin_events` (`DATA_MODEL.md` §15).

## 14. Archive semantics, application side

- **Permanent archive** = Part A truth: `archived_at != null`, set and cleared only by the scraper. The application displays it (per-area Archivio with cluster-of-origin column, UI §9.1) and **guarantees it cannot be damaged: the API exposes no operation that deletes, hides, or edits any listing document** — the UI-spec clause "a protection enforced by the shared backend" (UI §9.3) is realized structurally, not as a guarded delete.
- **Same-session moves** (*Aggiorna alla data odierna*, UI §9.2) are **client view state**: rows whose `data_vendita` is before the viewer's today are presented in the Archivio section for the session. Nothing is written. A listing with `data_vendita == null` is never moved.
- ***Svuota archivio*** (UI §9.3) therefore clears only the client-side same-session set — an operation on view state, with the confirmation flow of the UI spec; permanently archived rows are structurally untouchable.

## 15. Error handling, logging, observability

- **Fail closed and loud:** configuration is validated at startup (missing/invalid → refuse to start); a snapshot rebuild failure keeps serving the last good cache and logs an error (the UI shows its staleness via §10.1 metadata); unhandled route errors return the §6 envelope with a generic key, never a stack trace.
- **Structured logs** (pino): request id, session's user id, route, latency on every request line; cache rebuilds and their counts logged explicitly. On Cloud Run these are queryable in Cloud Logging with zero setup.
- **Client errors** surface as translated, non-technical messages keyed by the error envelope; the SPA distinguishes "can't reach the server" from "the server refused" (UI §10.2's spirit applied everywhere).
- **Health:** `/healthz` (liveness — process up) and `/readyz` (readiness — cache primed) for Cloud Run probes and the operator runbook.

## 16. Configuration management

Both apps follow 12-factor configuration — typed, validated at startup, `.env` in development, environment variables on Cloud Run; no secrets in the repository, ever. The complete setting catalog (names, types, defaults, effects) is [`CONFIGURATION.md`](CONFIGURATION.md).

## 17. Testing strategy

Offline by default: domain rules and schemas as pure unit tests; server modules against the **Firestore + Storage emulators** with seeded fixtures; API tests through Fastify's injection; Playwright e2e for the critical flows (auth, rate, chat, calendar) against the emulator-backed stack. Anything touching production is deliberate, marked, and read-only except in the deployment phase. Full catalog and gates: [`TESTING.md`](TESTING.md).

## 18. Deployment considerations

Frontend as static assets on **Firebase Hosting** (SPA rewrites, `/api/**` rewritten to Cloud Run); backend as a container on **Cloud Run** (`europe-west8` alongside the data, `max-instances = 1` per §8, min instances a documented cost/latency knob); **deny-all Firestore and Storage security rules** deployed and verified — the Admin SDK bypasses rules, and nothing else may pass. Blaze plan with budget alerts. Operator onboarding, service accounts, and the go-live checklist: [`DEPLOYMENT.md`](DEPLOYMENT.md).

## 19. Future extensibility

- **App-triggered "refresh now"** (UI §10.2, deferred): add via the database-only handshake — the application writes a request document (scope, requester, requested_at); the scraper polls and claims it, runs, and streams status back into the same document; the UI displays progress. Requires a small scraper-side addition (a polling entry point) plus a specified request lifecycle; no redesign on either side.
- **Push instead of polling:** the REST + polling contract can be upgraded to SSE from the same server endpoints (Cloud Run supports streaming) without changing the data layer's shape — swap the transport, keep the queries.
- **Horizontal scaling:** raise `max-instances` by replacing the in-process snapshot cache with a shared invalidation signal (a version document per scope, checked per request) — the cache interface in `apps/server` is written against that seam.
- **Language switching:** add a locale bundle and a switcher; the architecture (externalized strings, `Intl` formatting, per-feature namespaces) already supports it.
- **New listing fields** arriving from the scraper are ignored until adopted (additive tolerance, §4) — adopting one is a schema + UI change here, no coordination needed.
- **New clusters or rule changes** are edits to `packages/shared` constants — effective on the next snapshot rebuild, no data migration.
