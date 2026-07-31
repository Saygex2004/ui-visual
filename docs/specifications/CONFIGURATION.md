# Configuration — Every Setting of Both Apps

> Companion document to [`SPECIFICATIONS.md`](SPECIFICATIONS.md), expanding §16, and the source for `.env.example`. Principles: 12-factor (environment variables, `.env` only in development); typed and validated at startup with Zod — a missing or malformed required setting **refuses to start** with a message naming the variable; defaults are safe for development, explicit for production; secrets never enter the repository.

## 1. Server (`apps/server`) — required

| Variable | Type | Meaning |
|---|---|---|
| `PVPDASH_FIRESTORE_PROJECT_ID` | string | The shared Firebase project id (the `pvp-aste-…` id). |
| `GOOGLE_APPLICATION_CREDENTIALS` | path | Service-account JSON for the Admin SDK — **local/dev only**; on Cloud Run the runtime service account is used and this variable is unset. |
| `PVPDASH_SESSION_SECRET` | string ≥ 32 chars | HMAC key for session-cookie integrity. Rotation invalidates all sessions. |
| `PVPDASH_BOOTSTRAP_ADMIN_PASSWORD` | string | Initial admin password used **only** when the `users` collection is empty (`SPECIFICATIONS.md` §7); announced to the operator out-of-band. Remove from the environment after first bootstrap. |

## 2. Server — optional (defaults in parentheses)

| Variable | Type | Meaning |
|---|---|---|
| `PVPDASH_PORT` (`8080`) | int | Listen port (Cloud Run injects `PORT`; the server honours it over this). |
| `PVPDASH_ENV` (`development`) | enum | `development` \| `production`; gates pretty logs vs JSON, cookie `Secure`. |
| `PVPDASH_META_POLL_SECONDS` (`60`) | int | Cache-invalidation poll over the three `meta` documents (`SPECIFICATIONS.md` §8). |
| `PVPDASH_SNAPSHOT_MAX_AGE_HOURS` (`24`) | int | Safety rebuild: a snapshot older than this rebuilds even without a `meta` change. |
| `PVPDASH_SESSION_TTL_DAYS` (`30`) | int | Session lifetime; renewed on use. |
| `PVPDASH_ATTACH_MAX_MB` (`10`) | int | Per-file attachment size limit (UI §6.2). |
| `PVPDASH_ATTACH_TYPES` (`image/png,image/jpeg,image/webp,application/pdf`) | csv | Allowed attachment MIME types. |
| `PVPDASH_STORAGE_BUCKET` (project default bucket) | string | Firebase Storage bucket for attachments. |
| `PVPDASH_SIGNED_URL_TTL_MINUTES` (`15`) | int | Attachment download-URL lifetime. |
| `PVPDASH_MESSAGE_MAX_CHARS` (`4000`) | int | Rich-text message length limit (plain-text extraction counted). |
| `PVPDASH_CALENDAR_DAILY_TARGET` (`18`) | int | Automatic daily assignment size (UI §7.3). |
| `PVPDASH_LOG_LEVEL` (`info`) | enum | pino level. |

## 3. Emulator / test environment

| Variable | Meaning |
|---|---|
| `FIRESTORE_EMULATOR_HOST` | Set (e.g. `127.0.0.1:8081`) to route the Admin SDK to the Firestore emulator — the integration suites and the seeded dev environment set this; its **absence** is what "production access" means. |
| `FIREBASE_STORAGE_EMULATOR_HOST` | Same for the Storage emulator. |
| `PVPDASH_SEED` | `1` to load the listings/OMI/meta/runs/settings fixtures into the emulator at boot (`seed/lib.ts`'s `seedContent`). Deliberately excludes `users`/`sessions` and every other Part B collection, so it composes safely with `PVPDASH_RESET_ACCOUNTS_ON_BOOT` regardless of which runs first — the dashboard-browse e2e flow sets both together. |
| `PVPDASH_RESET_ACCOUNTS_ON_BOOT` | `1` to wipe `users`/`usernames`/`sessions` before bootstrap runs, so this boot creates a fresh admin (`SPECIFICATIONS.md` §7). The e2e `webServer` sets this — see `playwright.config.ts`; never set in dev or production. |

Emulator ports and the hosting emulator config live in `firebase/firebase.json`; tests must never run without the emulator variables set (`TESTING.md` §1).

## 4. Web app (`apps/web`) — build-time

Vite exposes only `VITE_`-prefixed variables; the SPA needs exactly one:

| Variable | Meaning |
|---|---|
| `VITE_API_BASE` (`/api`) | API origin+prefix. Default works in production (Hosting rewrites `/api/**` to Cloud Run) and in dev (Vite proxy to the local server). |

Everything else the frontend needs (cadences, bands, limits it must mirror) comes from `packages/shared` constants, not env — one source of truth, no drift between apps.

## 5. Constants that are code, not configuration

Deliberately **not** environment variables (changing them is a reviewed code change in `packages/shared`): the cluster taxonomy, exclusion set, and category catalog (`DOMAIN_RULES.md`); price-band boundaries; polling cadences (`API_CONTRACT.md` §10); the rich-text node allowlist. Rationale: they are product rules with tests over them, not deployment knobs.

## 6. `.env.example`

Phase 0 creates `.env.example` at the repo root listing every variable above with its default or a `<placeholder>`, and a `.gitignore` covering `.env`, `*.local`, and any service-account JSON. The example file is documentation; it never contains real values.
