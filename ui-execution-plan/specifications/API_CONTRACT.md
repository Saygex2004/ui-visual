# API Contract — the REST Surface

> Companion document to [`SPECIFICATIONS.md`](SPECIFICATIONS.md), expanding §6. Every endpoint of `apps/server`, in one place. All request/response schemas are Zod schemas in `packages/shared/api/` — the server validates against them, the client imports the inferred types; this document names the shapes and fixes the semantics. Behavioural references (UI §x) point to [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md).

## 1. General conventions

- **Base path** `/api`; JSON bodies; UTF-8; gzip on responses.
- **Authentication:** the session cookie (§2) on every route except `POST /api/auth/login` and `/healthz`/`/readyz`. Missing/invalid session → `401`; insufficient role → `403`; the client redirects `401` to the login screen preserving the requested URL (UI §2.1).
- **Error envelope**, every non-2xx: `{ "error": { "code": <http-status>, "key": "<i18n key>", "details": {} } }`. `key` is a message key from the shared error namespace (e.g. `errors.auth.invalidCredentials`, `errors.chat.threadClosed`); the server never composes user-facing prose. `details` carries structured facts the client may interpolate (counts, limits, skipped ids).
- **Ids** in paths are opaque strings (listing ids are the PVP decimal strings from `DATA_MODEL.md` §3).
- **Timestamps** in responses: ISO-8601 UTC strings. Calendar dates: `YYYY-MM-DD` strings, as stored.
- **Caching short-circuit:** snapshot and poll endpoints accept `If-None-Match` with the version tag they previously returned and answer `304` with no body when nothing changed — the polling tiers (`SPECIFICATIONS.md` §8) rely on cheap 304s.
- **No API versioning** in v1: one first-party client, deployed with the server; breaking changes are coordinated deploys.

## 2. Auth (`/api/auth`)

| Method & path | Body → Response | Semantics |
|---|---|---|
| `POST /auth/login` | `{ username, password }` → `{ user }` | Verifies argon2id hash; refuses disabled accounts; sets the httpOnly session cookie. `user` = `{ id, username, role, must_change_password }`. Failure: `401 errors.auth.invalidCredentials` (identical for unknown user and wrong password). |
| `POST /auth/logout` | — → `204` | Deletes the session, clears the cookie. |
| `GET /auth/me` | — → `{ user }` | The session's account; the SPA's boot call. |
| `POST /auth/password` | `{ current_password, new_password }` → `204` | Self-service change; also the forced first-sign-in change (clears `must_change_password`). Revokes the account's **other** sessions. |

While `must_change_password` is set, every route except `/auth/me`, `/auth/password`, `/auth/logout` answers `403 errors.auth.mustChangePassword` — the forced change is server-enforced, not a client courtesy.

## 3. Listings read path (`/api/areas`, `/api/listings`)

| Method & path | Response | Semantics |
|---|---|---|
| `GET /areas/:area/snapshot` | `AreaSnapshot` | `area` ∈ `immobili` \| `corporate`. The entire pre-computed dataset for the area, from the server cache — never from Firestore directly. ETag = snapshot version. |
| `GET /listings/:id` | `ListingDetail` | One listing in full: every stored field (untrimmed `descrizione`), its classification, blocco siblings (id + summary), OMI context per `DOMAIN_RULES.md` §9, current rating, thread summary (exists? unread? closed?), and the workspace header facts. `404` if unknown. |
| `GET /listings/:id/activity` | `{ events: ActivityEvent[] }` | The workspace timeline, newest first (UI §4.5). |

**`AreaSnapshot` shape (the payload budget):**

```
{
  version: string,            // cache build id — the ETag
  built_at: string,
  meta: { last_success_at, total_active, total_stored, detail_errors,   // per DOMAIN_RULES §10
          excluded_by_rules,                                            // immobili only
          omi: { fetched_at, semestre } },                              // immobili only
  clusters: [ { key, number, name, buckets: { principali: [ListingRow], fallimenti: [ListingRow] } } ],
  archive:  [ ListingRow & { cluster_key } ],
  omi_by_comune: { [slug]: OmiEntry },     // immobili only; slugs per DATA_MODEL §4
  blocco_index: { [blocco_key]: { count, listing_ids, clusters: [cluster_key] } }
}
```

`ListingRow` carries exactly the UI §4.1 columns plus routing facts (`id`, geography, band, `blocco_key`, `archived_at`) — **`descrizione` trimmed to a 200-char excerpt** (credits tables render only an excerpt; the workspace fetches the full text via `GET /listings/:id`). Ratings are **not** embedded (they change on a faster clock — §4); the client joins them from the ratings poll. Target: a 10k-listing snapshot ≤ ~3 MB gzipped; the size is asserted in tests (`TESTING.md` §4).

## 4. Ratings (`/api/ratings`)

| Method & path | Body → Response | Semantics |
|---|---|---|
| `GET /ratings?since=<ts>` | → `{ ratings: [{ listing_id, value, set_by, set_at }], now }` | All ratings changed since `since` (omit for full state). The ~20 s poll; ETag-friendly. Cleared ratings appear as `{ listing_id, value: null }` tombstones in the delta window. |
| `PUT /ratings/:listingId` | `{ value }` → `{ rating }` | Sets/changes the shared rating (`ottimo_affare` \| `da_verificare` \| `da_evitare`); records activity; marks completion (`DATA_MODEL.md` §11) on first rating. |
| `DELETE /ratings/:listingId` | → `204` | Clears (deletes) the rating (UI §5); records activity; completion stays. |

Ratings are last-write-wins by design (UI §5 — the rating is collective); no optimistic-lock error exists to translate.

## 5. Chat (`/api/chats`)

| Method & path | Body → Response | Semantics |
|---|---|---|
| `GET /chats` | → `{ threads: [ThreadListItem] }` | *Le mie chat* (UI §6.3): the user's threads, `last_message_at` desc, with unread flag, closed flag, preview, participants, and the listing's meta line (or its removed-from-archive placeholder state). |
| `GET /chats/unread` | → `{ total }` | The every-screen badge (UI §6.1): reads the single `user_counters` doc. The ~20 s poll. |
| `GET /chats/:listingId?after=<msgId>` | → `{ thread, messages }` | Opens/polls a thread. **First call joins the caller as participant and marks the thread read** (UI §6.2); subsequent polls pass `after` for the delta. Messages carry sanitized rich-text bodies and attachment descriptors. |
| `POST /chats/:listingId/messages` | `{ body?, attachment_ids? }` → `{ message }` | Sends; requires text or attachments (or both). Server sanitizes `body` (TipTap schema, link allowlist, linkify — `SPECIFICATIONS.md` §11), assigns `sent_at`, updates counters/preview. Closed thread → `409 errors.chat.threadClosed`. |
| `POST /chats/:listingId/participants` | `{ user_id }` → `{ thread }` | Adds a colleague; their counter gains the whole conversation as unread (UI §6.2). Closed thread → `409`. |
| `POST /chats/:listingId/close` · `/reopen` | — → `{ thread }` | Admin only; close requires the confirmed flag from the UI dialog; records activity. |

## 6. Attachments (`/api/attachments`)

| Method & path | Body → Response | Semantics |
|---|---|---|
| `POST /attachments?listing_id=<id>` | multipart file → `{ attachment }` | Uploads ahead of send; enforces size/type limits (`CONFIGURATION.md` §5) with `413 errors.attachments.tooLarge` / `415 errors.attachments.type`; stores blob + metadata doc. Unreferenced uploads older than a day are pruned by a startup sweep. |
| `GET /attachments/:id/url` | → `{ url, expires_at }` | Short-lived signed download URL after checking the caller may read the thread. Image previews use the same URL. |

## 7. Calendar (`/api/calendar`)

| Method & path | Body → Response | Semantics |
|---|---|---|
| `GET /calendar/:month` | → `{ days: [{ date, assigned, completed, actionable }] }` | Month view badges (UI §7.1), computed server-side from `calendar_days` + ratings. |
| `GET /calendar/day/:date` | → `{ listings: [CalendarRow], progress }` | Day view. **If `date` is today and the caller has no `calendar_days` doc for it, the transactional auto-assignment runs first** (`SPECIFICATIONS.md` §12), then the day is returned; past/future days never generate. `CalendarRow` = the UI §7.2 columns (internal id admin-only). |

**Admin assignment (`/api/admin/calendar`, admin-only):**

| Method & path | Body → Response | Semantics |
|---|---|---|
| `POST /admin/calendar/random` | `{ user_id, date, count }` → `{ assigned: [ids], day }` | The §8-DOMAIN_RULES engine; additive, no duplicates, eligibility enforced (UI §8.3.1). |
| `GET /admin/calendar/:userId/:date` | → `{ listings }` | What is assigned, for the removal screen. |
| `DELETE /admin/calendar/:userId/:date` | `{ listing_ids }` → `{ removed }` | Severs the calendar link only (UI §8.3.2); never touches listing or rating. |
| `GET /admin/listings/search?q=` | → `{ results }` | The by-id screen's search (id, court, municipality, region, description) with completed/area markers (UI §8.3.3). |
| `POST /admin/calendar/by-id` | `{ user_id, date, listing_ids }` → `{ assigned, skipped: [{ id, reason }] }` | The only corporate path; nonexistent/completed ids are skipped and reported. |

## 8. Administration (`/api/admin`, admin-only)

| Method & path | Body → Response | Semantics |
|---|---|---|
| `GET /admin/users` | → `{ users }` | Accounts table (UI §8.1) — no password hashes, ever. |
| `POST /admin/users` | `{ username, password, role }` → `{ user }` | Duplicate username → `409 errors.admin.usernameTaken`. Created with `must_change_password`. |
| `POST /admin/users/:id/password` | `{ new_password }` → `204` | Lifecycle: sets hash, sets `must_change_password`, revokes the account's sessions, records `admin_events`. |
| `POST /admin/users/:id/role` | `{ role }` → `{ user }` | Last-active-admin demotion → `409 errors.admin.lastAdmin`. |
| `POST /admin/users/:id/disable` · `/enable` | — → `{ user }` | Disable revokes sessions; last-active-admin → `409`. |
| `GET /admin/events` | → `{ events }` | The lifecycle audit (UI §8.1). |
| `GET /admin/categories` | → `{ catalog, selection, updated_at, updated_by }` | Catalog groups from `DOMAIN_RULES.md` Appendix A + current selection (absent doc → default set, flagged as such). |
| `PUT /admin/categories` | `{ codes }` → `{ selection }` | Writes `settings/extraction_categories` with `updated_by` = caller (`DATA_MODEL.md` §7); response reiterates the applies-at-next-refresh semantics for the confirmation copy. |
| `GET /admin/runs` | → `{ runs }` | Recent scraper runs, display-only (`DATA_MODEL.md` §6). |

## 9. Health

`GET /healthz` — liveness, always `200` once the process is up. `GET /readyz` — `200` only when config validated and the snapshot cache primed; Cloud Run's readiness probe and the runbook's first check.

## 10. The polling contract (client obligations)

| What | Endpoint | Cadence | Cheap path |
|---|---|---|---|
| Area snapshot | `GET /areas/:area/snapshot` | ~60 s + on window refocus | `304` on unchanged version |
| Ratings | `GET /ratings?since` | ~20 s while a table/workspace is visible | delta by `since` |
| Unread total | `GET /chats/unread` | ~20 s, every screen | single-doc read, `304` |
| Open thread | `GET /chats/:id?after` | ~5–10 s while open | delta by `after` |
| Calendar day progress | `GET /calendar/day/:date` | ~20 s while open | `304` |

Cadences are constants in `packages/shared` (`CONFIGURATION.md` §6) — tuned in one place, never sprinkled.
