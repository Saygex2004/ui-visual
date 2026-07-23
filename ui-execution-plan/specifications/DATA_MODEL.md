# Data Model — the Firestore Contract

> Companion document to [`SPECIFICATIONS.md`](SPECIFICATIONS.md), expanding §4. It has two parts. **Part A** is the boundary contract with the **scraper project** — the separate system that keeps the shared database current. It is reproduced here (adapted from the scraper's own contract document) because this repository is self-contained; it is **that project's law as much as ours**, and it must not drift: any change to Part A must be coordinated with the scraper project's owners. **Part B** defines the collections **this application owns outright** — the scraper never reads or writes them, and their shapes evolve at this project's sole discretion.

## 1. Ownership and change discipline

| Collection | Writer | Reader | Defined in |
|---|---|---|---|
| `listings`, `omi_prices`, `meta`, `runs` | scraper project only | this application | Part A |
| `settings` | this application (admin panel); the scraper's CLI wrote it as a stopgap before this app existed | scraper (at save time) + this application | Part A §7 |
| `users`, `sessions`, `ratings`, `chat_threads` (+ subcollections), `attachments`, `user_counters`, `calendar_days`, `assignment_index`, `listing_activity`, `admin_events` | this application only | this application | Part B |

Binding rules:

- **This application never writes a Part A collection** except `settings/extraction_categories`. The repository layer must contain **no code path** that creates, updates, or deletes documents in `listings`, `omi_prices`, `meta`, or `runs` — the guarantee is structural, not a runtime check.
- **Additive tolerance:** the scraper may add new optional fields to Part A documents unilaterally. This application must ignore fields it does not know — never error, never strip-and-rewrite.
- **Renames, removals, or semantic changes** on either side of the boundary require updating both projects together.
- **`content_hash` is scraper bookkeeping** (its delta-write digest). This application must never read, compare, or otherwise interpret it. Likewise `runs` is an operational audit trail: it may be *displayed* on admin surfaces, but no feature may *depend* on its contents.

## 2. General conventions (both parts)

- **Naming:** Part A field names use **Italian domain terms**, matching the PVP portal's vocabulary (`tribunale`, `valore_richiesto`, `disponibilita`, …); bookkeeping fields use plain English (`scope`, `archived_at`, `first_seen_at`, `content_hash`, `error`, `fetched_at`). Part B follows the same rule: English `snake_case` bookkeeping, Italian only where a value is itself domain vocabulary.
- **Calendar dates** (a day, no time-of-day): strings in `YYYY-MM-DD` form — they are dates in the Italian legal calendar, not instants; ISO strings sort correctly and carry no timezone ambiguity.
- **Instants:** native Firestore timestamps.
- **Missing values:** explicit `null` — never omitted, never a sentinel string such as `"N/D"`. Presentation fallbacks are the frontend's concern.
- **Free text is untrusted** — both portal-sourced (`descrizione`, labels) and user-authored (messages). Escaping/encoding for safe display is entirely the consumer's responsibility; rich text is additionally schema-sanitized at write time (`SPECIFICATIONS.md` §11).
- **Document ids** are strings; rules per collection below.

---

# Part A — Scraper-owned collections (read-only)

## 3. Collection `listings`

One document per auction lot ever seen by the scraper. Documents are **never deleted**; disappearance from the portal is expressed through `archived_at` (§3.3).

**Document id:** the PVP listing id rendered as a decimal string.

### 3.1 Field dictionary

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | integer | no | The PVP listing id, duplicated from the document id for queries and exports |
| `scope` | string | no | Which scraper refresh owns the record: `"immobili"` or `"corporate"` — stored explicitly, never derived from asset codes |
| `tipo_bene` | string | yes | Asset-type label (property type, or "company share"/"credit" label) |
| `cod_tipo_categ_lotto` | string | yes | Raw asset-category code — the credits area's routing input (`DOMAIN_RULES.md` §3) |
| `tipo_procedura` | string | yes | Procedure-type label |
| `cod_tipo_rito` | string | yes | Procedural-regime code — the Fallimenti-split and extraction-category input (`DOMAIN_RULES.md` §4, Appendix A) |
| `cod_tipo_registro` | string | yes | Registry-type code — the exclusion-rule input (`DOMAIN_RULES.md` §5) |
| `numero` | string | yes | Proceeding number |
| `anno` | string | yes | Proceeding year |
| `tribunale` | string | yes | Court name |
| `valore_richiesto` | number | yes | Base auction price in euro; **legitimately `0` for many credits** — zero is a value, not a gap |
| `data_pubblicazione` | string `YYYY-MM-DD` | yes | Publication date |
| `data_vendita` | string `YYYY-MM-DD` | yes | Sale date |
| `regione` | string | yes | Region, as labeled by PVP |
| `provincia` | string | yes | Province, as labeled by PVP |
| `comune` | string | yes | Municipality, as labeled by PVP |
| `link` | string | no | Public URL of the listing on the portal |
| `disponibilita` | string | no | Single representative occupancy label (§3.2) |
| `descrizione` | string | no (may be empty) | Full free-text lot description, verbatim from the portal |
| `archived_at` | timestamp | yes | When the scraper observed the listing gone from the active list; `null` while active (§3.3) |
| `first_seen_at` | timestamp | no | When the scraper first stored the listing |
| `last_seen_at` | timestamp | no | Most recent scraper run that saw the listing active |
| `content_hash` | string | no | Scraper-internal delta digest — **must not be interpreted here** (§1) |

**Geography note:** `regione`, `provincia`, and `comune` are null **together** in the common failure mode (PVP recorded the address only in free text). Such listings are routed to the non-geolocated catch-all cluster (`DOMAIN_RULES.md` §2); nothing else may be inferred from the nulls.

### 3.2 Occupancy (`disponibilita`)

Exactly one of six labels, already summarized by the scraper (highest-risk-wins over the lot's items): `Libero`, `Occupato`, `Occupato senza titolo`, `In corso di liberazione`, `Parzialmente occupato`, `Non specificato`. The application treats the label as authoritative — it never re-derives occupancy.

### 3.3 Archival semantics (`archived_at`)

- `archived_at = null` — part of the stored active set at the owning scope's most recent successful refresh.
- `archived_at = <timestamp>` — the scraper found the listing **either** missing from the portal's active enumeration **or** excluded by the extraction-category selection (§7). Either way this is the **permanent archive** (UI §9.1): the document stays retrievable forever.
- **Re-activation:** if an archived listing re-enters the fresh stored set, the scraper clears `archived_at` back to `null`. The application must handle both transitions appearing between snapshot rebuilds (and records them as activity events, Part B §9).
- The scraper never deletes documents — and neither does this application: **no API operation deletes, hides, or edits a listing** (`SPECIFICATIONS.md` §14). The UI-spec protection clause for *Svuota archivio* (UI §9.3) is satisfied structurally.

## 4. Collection `omi_prices`

One document per **(provincia, comune) pair** appearing in the stored real-estate data. Each scraper OMI run (monthly) **replaces** a comune's document in full.

**Document id:** a composite slug, `{slug(provincia)}-{slug(comune)}` — lowercased, accents removed, non-alphanumerics collapsed to hyphens. Consumers must treat the `provincia`/`comune` **fields**, not the id, as display values.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `provincia` | string | no | Province name exactly as it appears in the listings data |
| `comune` | string | no | Comune name exactly as it appears in the listings data — the municipality actually queried |
| `tipologia` | string | yes | Tipology of the quotation row used (normally `"Abitazioni civili"`) |
| `stato` | string | yes | Property state of the row used (normally `"NORMALE"`) |
| `min_mq` | number | yes | Minimum of the €/m² range |
| `max_mq` | number | yes | Maximum of the €/m² range |
| `zona` | string | yes | Display label of the OMI zone the sample comes from |
| `semestre` | string | no | The OMI semester the values refer to (e.g. `"20252"` = 2025 H2) |
| `fetched_at` | timestamp | no | When this comune was fetched |
| `error` | string | yes | `null` on success; otherwise a human-readable error marker, and the five data fields above are null |

Two semantics the UI depends on:

- **`error` set ⇒ "we tried, and there is no data"** — render the §3.3-UI "OMI data not available" state. An **absent document** means "not processed yet" — the same rendered outcome, but the distinction matters in diagnostics.
- **The reference is always residential.** The scraper queries the OMI service for residential use only and prefers the *Abitazioni civili / NORMALE* row, **regardless of the listing's asset type** — a comune present only because of a warehouse listing still carries a residential €/m². `tipologia` records this precisely so the UI can caption the panel honestly (`DOMAIN_RULES.md` §9). There is no commercial/industrial OMI data anywhere in the system.

## 5. Collection `meta`

Exactly three well-known documents, powering the per-area "last refreshed" header (UI §10.1).

**Documents `immobili` and `corporate`:**

| Field | Type | Meaning |
|---|---|---|
| `last_success_at` | timestamp | End time of the scope's last successful refresh (degraded counts as successful; failed does not update `meta`) |
| `total_active` | integer | Active listings found by that refresh's **enumeration** — the UI's "total found" |
| `total_stored` | integer | Listings actually persisted after the extraction-category selection — the UI's "analyzed" numerator |
| `detail_errors` | integer | Listings whose detail fetch or validation failed in that refresh |

**Document `omi`:**

| Field | Type | Meaning |
|---|---|---|
| `fetched_at` | timestamp | End time of the last OMI run |
| `semestre` | string | The semester that run used |

These three documents are also the application's **cache-invalidation signal** (`SPECIFICATIONS.md` §8): a change in `last_success_at`/`fetched_at` means the underlying collections changed. The mapping of every UI §10.1 figure to its source is fixed in `DOMAIN_RULES.md` §10.

## 6. Collection `runs`

One document per scraper execution — its audit trail. **Document id:** scope name + start timestamp (sortable). Fields: `scope` (`immobili`/`corporate`/`omi`), `status` (`success`/`degraded`/`failed`), `started_at`, `finished_at`, `total_enumerated`, `written`, `archived`, `errors`, `selection_codes` (list \| null), `excluded_by_selection` (integer), `error_samples` (list of strings). Display-only on admin surfaces (§1).

## 7. Collection `settings` — the extraction-category selection

One well-known document, **`settings/extraction_categories`** — the deliberate application→scraper channel, and the **only Part A document this application writes** (UI §8.2, `SPECIFICATIONS.md` §13).

| Field | Type | Meaning |
|---|---|---|
| `codes` | list of strings | The **enabled** procedural-category (rito) codes for the immobili scope |
| `updated_at` | timestamp | When the selection was last changed |
| `updated_by` | string | The acting account id (historically `"scraper-cli"` for the pre-app stopgap) |

Semantics binding on both projects:

- **Absent document ⇒ the default selection applies** (the 10 "base" insolvency codes — `DOMAIN_RULES.md` Appendix A). Only an explicit admin choice writes the document.
- **Fail-open:** the scraper always stores a record whose `cod_tipo_rito` is missing or unrecognized, whatever `codes` says — a new portal category can never silently vanish.
- **Immobili scope only, save time only:** corporate records are never filtered; the selection does not shorten a scraper run (no server-side category filter exists on the portal). The admin panel must state both facts (UI §8.2).
- **Effect timing:** narrowing archives affected listings at the **next scraper refresh**; widening re-activates them at the next refresh. The panel's confirmation copy reflects this.
- The scraper tolerates unknown extra fields on this document; this application may add presentation state alongside `codes` if ever needed (additive, documented here first).

## 8. Read patterns Part A guarantees

The scraper project has committed to keeping these queries working; the application builds on exactly these and nothing more:

- Active listings of a scope: `scope == X` and `archived_at == null`. All cluster/exclusion classification happens **here, in memory** — the raw codes (`cod_tipo_registro`, `cod_tipo_rito`, `cod_tipo_categ_lotto`) and geography fields are guaranteed present (possibly null) for that purpose.
- Archived listings of a scope: `scope == X` and `archived_at != null`.
- The full `omi_prices` collection, read as a lookup map.
- The three `meta` documents by id.
- Recent `runs` ordered by `started_at` descending.
- `settings/extraction_categories` by id.
- **Blocco grouping:** the four fields (`tipo_procedura`, `tribunale`, `numero`, `anno`) are **load-bearing** — the scraper will not change their semantics; grouping rules are `DOMAIN_RULES.md` §6.

**Quota context:** this per-document contract prices a whole-set read at ~1 Firestore read per document. That is why all listing reads are funneled through the server-side snapshot cache invalidated by `meta` polling (`SPECIFICATIONS.md` §8) — the application must never let per-client traffic reach these collections.

---

# Part B — Application-owned collections

> Shapes below are the v1 contract for this project's own data. Changes are this project's to make, but the same discipline applies internally: additive changes are cheap; renames and semantic changes require migrating stored data and updating every reader. All writes go through `apps/server`; Zod schemas for every document live in `packages/shared`.

## 9. Accounts and sessions

**Collection `users`** — document id: a server-generated opaque id (usernames are unique but mutable-hostile as ids).

| Field | Type | Meaning |
|---|---|---|
| `username` | string | Unique, case-insensitively; the sign-in identifier and display name |
| `password_hash` | string | argon2id hash |
| `role` | string | `user` \| `admin` |
| `disabled` | boolean | A disabled account cannot sign in; its sessions are revoked at once (UI §8.1) |
| `must_change_password` | boolean | Set at creation and on admin password change; forces the UI §2.1 first-sign-in change |
| `created_at` / `updated_at` | timestamps | Bookkeeping |

Invariants: usernames unique (transactionally enforced via a `usernames/{lowercased}` claim document); the last active administrator can be neither disabled nor demoted; accounts are never deleted (authorship stays attributed forever).

**Collection `sessions`** — document id: a cryptographically random 128-bit+ token (the cookie value's hash — store the hash, not the token). Fields: `user_id`, `created_at`, `last_used_at`, `expires_at`. Sessions are long-lived and renewed on use; password change and disable delete the account's other sessions.

## 10. Ratings

**Collection `ratings`** — document id: **the listing id** (one shared rating per listing, UI §5).

| Field | Type | Meaning |
|---|---|---|
| `value` | string | `ottimo_affare` \| `da_verificare` \| `da_evitare` |
| `set_by` | string | Acting user id |
| `set_at` | timestamp | When set |

Clearing a rating **deletes the document** — an unrated listing stores nothing. Ratings survive listing archival (keyed by listing id, never joined destructively). Every set/change/clear also appends a `listing_activity` event (§12) and, if the listing was never completed before, a completion record (§11).

## 11. Calendar

**Collection `calendar_days`** — document id: **`{user_id}_{YYYY-MM-DD}`** (deterministic — the id *is* the concurrency guard: automatic assignment creates it in a transaction, so two racing first-opens cannot double-assign, `SPECIFICATIONS.md` §12).

| Field | Type | Meaning |
|---|---|---|
| `user_id` / `date` | string | Duplicated from the id for queries |
| `listing_ids` | list of strings | The day's assigned listings, in assignment order |
| `generated` | string | `auto` \| `admin` \| `mixed` — how the set came to be |
| `created_at` / `updated_at` | timestamps | Admin additions/removals update the list and `updated_at` |

**Collection `assignment_index`** — document id: **the listing id**. The "never assigned twice, never after completion" ledger (UI §7.3): `assigned_to` (user id), `date`, `assigned_at`, `completed_at` (timestamp \| null — set when any user rates the listing, and **never cleared**: completion is permanent even if the rating is later cleared, `SPECIFICATIONS.md` §10). Eligibility checks and the admin by-id screen read this index; removal of an assignment (UI §8.3) deletes the index entry only if the listing is not completed.

## 12. Activity history

**Collection `listing_activity`** — document id: auto. Immutable, append-only events rendering the workspace timeline (UI §4.5).

| Field | Type | Meaning |
|---|---|---|
| `listing_id` | string | The listing the event belongs to |
| `type` | string | Closed vocabulary, below |
| `actor_id` | string \| null | The acting user; `null` for system-observed events |
| `at` | timestamp | When |
| `details` | map | Small, type-specific payload (e.g. old/new rating value) |

**Event vocabulary (v1, closed):** `rating_set`, `rating_changed`, `rating_cleared`, `thread_opened`, `thread_closed`, `thread_reopened`, `attachment_added`, `calendar_assigned`, `calendar_removed`, `listing_archived`, `listing_reactivated` (the last two are system events recorded when a snapshot rebuild observes the transition). Extending the vocabulary is additive; renaming or reusing a type is not. Events are never edited or deleted; no retention pruning in v1 (volumes are small — revisit only with evidence).

## 13. Chat

**Collection `chat_threads`** — document id: **the listing id** (exactly one thread per listing, UI §6).

| Field | Type | Meaning |
|---|---|---|
| `participant_ids` | list of strings | Everyone who ever opened the thread or was added to it |
| `closed` | boolean | Admin-closed threads accept no messages/participants and stop counting toward unread (UI §6.2) |
| `closed_by` / `closed_at` | string \| null, timestamp \| null | Close bookkeeping |
| `last_message_at` | timestamp \| null | Drives the *Le mie chat* ordering |
| `last_message_preview` | map \| null | `{ author_id, excerpt }` — denormalized for the list screen |
| `message_count` | integer | Denormalized counter |
| `created_at` | timestamp | First open |

**Subcollection `chat_threads/{listing_id}/messages`** — document id: auto, ordered by `sent_at`.

| Field | Type | Meaning |
|---|---|---|
| `author_id` | string | Sender |
| `sent_at` | timestamp | Server-assigned send time |
| `body` | map \| null | Sanitized TipTap JSON (constrained schema, `SPECIFICATIONS.md` §11); `null` for attachment-only messages |
| `attachment_ids` | list of strings | Attached files (§14); may be empty |

A message carries text, attachments, or both — never neither. Bodies are sanitized **at write time**; readers render stored truth without further transformation.

**Subcollection `chat_threads/{listing_id}/reads`** — document id: **user id**. Fields: `last_read_at` (timestamp). Opening the thread upserts it; unread = messages with `sent_at > last_read_at` from other authors.

**Collection `user_counters`** — document id: **user id**. Fields: `unread_total` (integer), `updated_at`. Maintained transactionally on message send (increment every other participant), thread read (decrement by the amount read), participant add (increment by the thread's message count — "the entire conversation arrives unread", UI §6.2), and thread close/reopen (subtract/re-add that thread's unread). This single small document is what every screen's badge polls — **never** a fan-out over threads (`SPECIFICATIONS.md` §8).

## 14. Attachments

**Collection `attachments`** — document id: auto (also the Storage object key suffix).

| Field | Type | Meaning |
|---|---|---|
| `listing_id` / `message_id` | string | Where it belongs |
| `uploader_id` | string | Who uploaded |
| `filename` | string | Original name, for display/download |
| `content_type` | string | Validated MIME type |
| `size_bytes` | integer | Validated size |
| `storage_path` | string | Object path in the Firebase Storage bucket |
| `uploaded_at` | timestamp | When |

Blobs live in Firebase Storage under `attachments/{listing_id}/{attachment_id}` — a server-generated path; the original filename is metadata only (never a path segment). Size/type limits are configuration (`CONFIGURATION.md`); downloads are short-lived signed URLs minted after an authorization check; the bucket is closed to direct client access (`DEPLOYMENT.md`).

## 15. Admin events

**Collection `admin_events`** — document id: auto. The lifecycle audit of UI §8.1: `type` (`account_created`, `password_changed`, `role_changed`, `account_disabled`, `account_enabled`, `categories_changed`), `actor_id`, `subject` (user id or `settings/extraction_categories`), `at`, `details`. Append-only, admin-visible.

## 16. Indexes

Part A queries are equality-shaped and served by automatic single-field indexes (the scraper project already maintains its own composite for `runs`). Part B needs (declared in `firebase/firestore.indexes.json`, created in the emulator and deployed with the rules):

- `calendar_days`: `user_id ASC, date DESC` (month view).
- `listing_activity`: `listing_id ASC, at DESC` (timeline).
- `chat_threads`: `participant_ids ARRAY_CONTAINS, last_message_at DESC` (*Le mie chat*).
- `messages` (collection group): `sent_at ASC` per thread is automatic; no composite needed in v1.

Any further composite Firestore names at first use; add it to the file rather than clicking it into existence.
