# Phase 3 — Authentication, Sessions, Account Lifecycle

> Goal: the complete auth layer end to end — argon2id credentials, cookie sessions, first-run bootstrap admin, forced password change, role enforcement on every route, the full account-lifecycle admin surface — plus the SPA's login screen, app shell, and route guard. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. Access is strictly by named account (roles `user`/`admin`), admin-created, username + password, sessions persisting across restarts — and the approved account-lifecycle enhancement (password/role change, disable) is in scope here, not deferred. After this phase, every existing and future route is closed by default; Phase 2's open routes get locked now.

**State when this phase starts:** Phases 0–2 delivered the skeleton, the shared package + fixtures, and the emulator-verified repositories/cache with open read endpoints — see `HANDOFF_PHASE_0..2.md`. No `users`/`sessions` code exists; the web app has placeholder routes only.

## Required reading

- [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md) — §7 (the auth design), §15 (error/logging posture)
- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §2.1 (sign-in gate), §2.5 (user menu), §8.1 (accounts + lifecycle)
- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — §9 (users/sessions), §15 (admin events)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §2 (auth routes + must-change gate), §8 (admin account routes)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §3 (auth catalog), §5 (flow 1)
- [`../specifications/CONFIGURATION.md`](../specifications/CONFIGURATION.md) — §1 (`SESSION_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD`), §2 (session TTL)

## Entry criteria

1. `HANDOFF_PHASE_2.md` outcome `complete`; offline + integration suites green at the inherited commit.
2. Emulators + seed working (commands in the earlier handoffs).

## Tasks

1. **Repositories (Part B):** `users` (with the `usernames/{lowercased}` uniqueness claim, transactional), `sessions` (hashed token ids, TTL, revocation by user), `admin_events` (append).
2. **Auth module** (`modules/auth/`): login (identical error for unknown user / wrong password; disabled refused), logout, `me`, self password change (revokes other sessions, clears `must_change_password`); the session cookie per `SPECIFICATIONS.md` §7 (httpOnly, `Secure` in production, SameSite=Lax, renewed on use); a Fastify auth plugin decorating requests with the account and enforcing: session required everywhere except login/health, the **must-change gate** (`API_CONTRACT.md` §2), and per-route role checks. **Lock the Phase 2 listing routes** behind it.
3. **Bootstrap:** on startup with an empty `users` collection, create the initial admin from `PVPDASH_BOOTSTRAP_ADMIN_PASSWORD` (username `admin`), flagged `must_change_password`; log a single unambiguous line naming the username (never the password); refuse to bootstrap when the variable is unset and the collection is empty.
4. **Admin accounts module** (`modules/admin/`): list (no hashes), create (duplicate → `409`), and the lifecycle actions — set password, change role, disable/enable — each with session revocation where specified, **last-active-admin protection**, and an `admin_events` record; the events listing route.
5. **Web — auth feature:** login screen (*Entra*, error handling, `redirect` return), forced-password-change screen (blocking, per the server gate), session boot via `me`, and the **app shell**: the user-menu header of UI §2.5 (account name, Calendario / Le mie chat / Amministrazione (admins) / *Esci*, with the unread badge as a wired-but-zero placeholder until Phase 7), plus the router auth guard (redirect to `/login?redirect=…`, restore after sign-in).
6. **Web — admin accounts screen** (UI §8.1): the accounts table with lifecycle actions, confirmations, and outcome messages; the create form; the two onward links (calendar assignment, categories) as disabled placeholders until Phases 5/8. All copy in the `it` catalog.
7. **Integration + e2e:** the `TESTING.md` §3 auth catalog, and Playwright flow 1 (bootstrap → admin creates a user → forced change → sign-in lands on requested URL) against the emulator-backed stack.
8. **Verify, commit, handoff.**

## Verification

- Suites green (offline, integration, the new e2e); lint/typecheck/build green.
- Manual walk with seeded users: anonymous hit on a listing route → `401` and the SPA redirects to login; after sign-in the originally requested URL loads; restart the dev server — the session survives; sign-out ends it.
- Lifecycle: disable a signed-in test account → its next request is refused and its session is gone; attempt to demote/disable the last admin → `409` with the right key; every lifecycle action appears in the events listing.
- The bootstrap log line appears exactly once on an empty database and never on a populated one.

## Constraints

- **Passwords:** argon2id only; no password ever logged, returned, or stored in any other form; the bootstrap variable's value never echoes anywhere.
- **No Firebase Auth** — the decision is recorded in `SPECIFICATIONS.md` §7; do not reintroduce it.
- Role enforcement is server-side; the client's hiding of admin UI is presentation, never the control.
- Accounts are never deleted (`DATA_MODEL.md` §9); do not add a delete route "for symmetry".

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_3.md` from the template. In *Carry-over*: the seeded/test credentials for later phases (dev-only values), the auth plugin's decorator surface (how later modules read the current account), the must-change gate's route allowlist, and the reminder that from here on **every new route must declare its role requirement explicitly**.
