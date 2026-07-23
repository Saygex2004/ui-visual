# Phase 7 — Chat, Rich Text, Attachments, Unread Counters

> Goal: the full collaboration layer — one thread per listing with join-on-open semantics, rich-text messages under a server-enforced sanitization schema, file/image attachments through Firebase Storage, transactional unread counters powering the every-screen badge, the *Le mie chat* screen, and admin close/reopen. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database (and its Storage bucket) kept current by a separate scraper project. Chat is the team's hand-off mechanism — "look at this one" — so its unread signal must be trustworthy on **every** screen, and its content model (rich text + attachments, an approved enhancement) must stay safe: bodies are TipTap JSON sanitized **at write time** against a closed node allowlist, and blobs are only ever reachable through server-minted signed URLs.

**State when this phase starts:** Phases 0–6 delivered everything through the workspace and live ratings; the workspace chat tab, the shell's unread badge, and `ListingDetail`'s thread facts are placeholders; `modules/chat|attachments` do not exist — see `HANDOFF_PHASE_0..6.md`.

## Required reading

- [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) — §6 (all of it), §2.5 (the badge on the user menu)
- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — §13 (threads/messages/reads/counters), §14 (attachments)
- [`../specifications/API_CONTRACT.md`](../specifications/API_CONTRACT.md) — §5 (chat), §6 (attachments), §10 (cadences)
- [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md) — §11 (the content-safety design)
- [`../specifications/CONFIGURATION.md`](../specifications/CONFIGURATION.md) — §2 (attachment limits, message length, signed-URL TTL), §3 (Storage emulator)
- [`../specifications/TESTING.md`](../specifications/TESTING.md) — §3 (chat + attachments catalogs), §5 (flow 3)

## Entry criteria

1. `HANDOFF_PHASE_6.md` outcome `complete`; all suites green at the inherited commit.
2. The Storage emulator runs alongside Firestore's (`pnpm emulators`).

## Tasks

1. **Chat repositories + module** (`modules/chat/`): threads/messages/reads per `DATA_MODEL.md` §13 — open-joins-participant + upsert read state; send (server `sent_at`, text and/or attachments, length limit); participant add ("entire conversation arrives unread"); admin close/reopen (confirmation flag, activity events); the `?after` delta poll; closed-thread refusals (`409`) for send/add.
2. **The sanitizer** (server-side, shared render fixtures): validate incoming TipTap JSON against the `packages/shared` allowlist — strip unknown nodes/marks, allowlist link protocols, linkify plain URLs — **one function, applied on write**; store only sanitized truth. Property-style tests over hostile inputs (script links, nested unknowns, oversized docs).
3. **Unread counters:** the `user_counters` transactional arithmetic on send / read / participant-add / close / reopen (`DATA_MODEL.md` §13); `GET /chats/unread`; an invariant integration test that recomputes truth from read states and compares after a scripted storm of operations.
4. **Attachments module** (`modules/attachments/`): multipart upload with size/type enforcement (`413`/`415` keys), blob to Storage under the server-generated path, metadata doc, `attachment_added` activity; signed-URL endpoint gated by thread access; the orphan sweep at startup.
5. **Web — thread view** (`features/chat/`, one component used by both the workspace tab and `/chat/:listingId`): header facts + removed-listing placeholder state; participant list + add-colleague (hidden when closed); message list (author, timestamp, own-vs-others, shared read-only rich-text renderer, image previews, download actions); the ~5–10 s delta poll with near-bottom auto-scroll; the rich-text compose (exactly the allowed formats) + attach + send; closed-state notice with admin reopen; empty-thread invitation.
6. **Web — *Le mie chat*** (UI §6.3): the participant's threads by recent activity with unread emphasis, closed markers, previews, de-emphasized non-openable removed-listing items, and the no-threads explainer. **Wire the shell badge** (Phase 3's placeholder) to the unread poll — every screen, capped *9+* display — and the same total beside the menu item.
7. **Quick chat action:** the Phase 4 row action now deep-links to `/aste/:area/lotto/:id?pannello=chat`; `ListingDetail` thread facts filled.
8. **Hallmark pass** on the chat surfaces (thread anatomy, compose, list screen).
9. **Integration + e2e:** the full `TESTING.md` §3 chat/attachments catalogs and Playwright flow 3 (two users: rate, quick-chat, rich text + attachment, badges everywhere, read-clearing, add-colleague, close/reopen).
10. **Verify, commit, handoff.**

## Verification

- All suites green (incl. the counter-invariant storm and sanitizer property tests); lint/typecheck/build green.
- Two-browser walk: A sends rich text (bold + list + pasted URL) with an image — B's badge increments on the dashboard, calendar placeholder, and admin screens within one poll; B opens via the quick action, sees the rendered body (URL clickable, image preview), badge clears; adding C hands the full history unread; admin closes — compose and add-colleague gone, B still reads and downloads; reopen restores.
- A `javascript:` link and a `<script>`-bearing paste arrive stored sanitized (assert stored JSON), and render inert.
- Oversized and disallowed-type uploads refused with the right keys before any blob is written.

## Constraints

- **No client Storage access** — uploads and downloads only through the server; signed URLs are short-lived and never stored in documents.
- **Sanitize on write, render stored truth** — the client renderer must not re-sanitize (divergence risk); it renders what the server stored, through the one shared component.
- Counter updates are transactional with the triggering operation — no "recount later" repair jobs.
- Threads are never deleted; a removed listing's thread stays readable (UI §6.2's placeholder header).

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_7.md` from the template. In *Carry-over*: the sanitizer's location and fixture set, the counter arithmetic's invariants (Phase 8's calendar day view reuses the badge), Storage emulator specifics, and the note that **Phase 8 adds the calendar surfaces and reuses the rating cell and workspace unchanged**.
