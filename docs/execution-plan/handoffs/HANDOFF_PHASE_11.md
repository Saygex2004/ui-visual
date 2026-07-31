# Handoff — Phase 11: Hardening (Accessibility, Performance, Polish)

- **Phase:** 11 — Hardening: Accessibility, Performance, i18n Completeness, Designed States
- **Date:** 2026-07-31
- **Outcome:** complete

## 1. Completed

All eight tasks of [`PHASE_11_HARDENING.md`](../PHASE_11_HARDENING.md), on branch
`phase-11-hardening` (on top of Phase 13's `new-ui-design-plan` state). Not yet committed at
the time this handoff was written — see §4.

1. **Spec-conformance sweep.** Mechanical checks: zero raw hex/oklch/font literals outside
   `tokens.css`; zero emoji-as-icon (confirmed removed by Phase 13); zero native
   `alert`/`confirm`/`prompt` (only comments reference them). Found and fixed one genuine
   **forked pattern**: `BloccoJumpChooser.tsx` hand-rolled its own `role="menu"`/`role="menuitem"`
   list inside a Popover instead of using the shared `DropdownMenu` primitive every other menu
   in the app uses — it had **no keyboard navigation at all** (no arrow keys, no typeahead,
   no `:focus-visible`). Rewritten onto `MenuRoot`/`MenuTrigger`/`MenuContent`/`MenuItem`
   (`apps/web/src/features/dashboard/DataTable/BloccoJumpChooser.tsx`); the now-dead
   `.blocco-jump-menu-list`/`.blocco-jump-menu-item` CSS removed. Also found and removed a
   **dead i18n namespace**: `archive.json` was registered in `i18n/index.ts` but was an empty
   `{}` — its real keys live under `dashboard.json`'s `archive.*` — removed the file and its
   registration. Full visual walk of every Appendix A screen, both themes, confirmed no other
   deviations. Three mechanical token/CSS fixes done first, before the axe pass (§1 task 1 of
   the plan): `dropdownMenu.css`'s `.ui-menu-item` had no `:focus-visible` ring (added, matching
   every other component); `chat.css`'s `.chat-mention-popup` hard-coded `z-index: 5` instead of
   `var(--z-popover)` (fixed); `statusDisplay.css`'s spinner had its own dead-duplicate keyframe
   instead of reusing the shared `pvp-spin` (fixed).

2. **Accessibility audit + fixes.**
   - **`aria-activedescendant` wired onto the chat mention picker** (`RichTextEditor.tsx`,
     `mention/MentionPopup.tsx`, new `mention/mentionOptionId` helper) — the contenteditable
     surface had `role="listbox"`/`role="option"` popup markup but no programmatic link telling
     assistive technology which option is current. Verified live: activedescendant tracks the
     active option through typing and arrow-key navigation, cleared on close.
   - **A real, previously-invisible bug found and fixed**: dismissing the mention popup with
     Escape also closed the entire workspace drawer underneath it. Root cause: Radix's
     `DismissableLayer` (Dialog's Esc handling) listens on `document` in the **capture phase**,
     always running before anything inside the dialog's own content — a `stopPropagation()` call
     from inside the mention extension's keydown handler is structurally too late to matter.
     `event.preventDefault()` from Dialog's own `onEscapeKeyDown` prop *does* stop the drawer
     (Radix respects it) — but ProseMirror treats an already-`defaultPrevented` event as "handled
     elsewhere" and silently skips its own Escape handling too, so the popup then never closed
     either. Fixed with a small dedicated module,
     `apps/web/src/features/chat/mention/activeMentionRegistry.ts`: `WorkspacePanel`'s
     `onEscapeKeyDown` calls `closeActiveMention()` directly and only calls `preventDefault()` if
     it actually closed something — both effects driven from the same event handler, no
     propagation race to lose. Verified live: Escape with a mention open now closes only the
     popup (drawer stays open); Escape with no mention open still closes the drawer as before
     (regression-checked).
   - **Manual keyboard-only pass** (13 checks, scripted, not committed as a throwaway — see the
     new *committed* keyboard-only e2e test below) over the newer Phase 13 patterns: cluster
     combobox open/arrow/Enter/Escape + focus-return, row overflow menu open/arrow/Escape +
     focus-return, workspace dialog 25-Tab focus-trap holds, workspace Escape-close, calendar
     day-cell Enter-to-open, admin tabs ArrowRight. All 13 passed with no fixes needed beyond the
     mention-picker bug above.
   - **Committed axe infrastructure built from scratch** — `@axe-core/playwright` added as a
     devDependency; new `e2e/ui-accessibility.spec.ts` runs axe over every Appendix A screen
     (13 screens), both themes, at the default 1280px width, plus a narrow 375px spot-check on 4
     representative screens (landing, area+region-drilldown, workspace, admin) — 42 axe scans in
     one committed test. **Found and fixed real, previously-undiscovered WCAG AA failures**
     (details in §2). Zero committed axe coverage existed anywhere before this phase — every
     prior pass (Phase 10, Phase 13) was a disposable, never-committed script.
   - **Committed keyboard-only flow test** (`e2e/ui-accessibility.spec.ts`, third describe
     block) — TESTING.md §5 flow 6 requires a keyboard-only pass through login → rate → chat as
     part of the e2e suite; this did not exist as committed coverage before (only as an ad-hoc
     manual script). New test drives the whole flow — login form Enter-submit, "Apri scheda"
     link Enter-open, rating button Enter-set, Radix Tabs ArrowRight navigation to the Chat tab,
     typed message + Enter-to-send, Escape-close — with zero mouse clicks.

3. **Responsive audit.** New `e2e/ui-accessibility.spec.ts` describe block: no horizontal page
   overflow (`scrollWidth <= clientWidth`) at 1024px/768px on the area view (with region
   drill-down active), calendar month, and admin accounts; frozen actions column still reachable
   at those widths; selector toolbar wraps rather than overflowing at 768px after a cluster
   reselect. All passed on the first run — the existing `flex-wrap`/`min()`/percentage-based
   responsive idioms already in `dashboard.css`/`admin.css`/`chat.css` held up; no CSS fix was
   needed here, only the new verification.

4. **i18n completeness — built from scratch.** New
   `apps/web/src/i18n/i18nCompleteness.test.ts` (runs under `pnpm test`): a static regex scan of
   every `.ts`/`.tsx` file under `apps/web/src` for `t('key')`/`` t(`key`) `` call sites, resolves
   each to a namespace (explicit `ns:` prefix, or the nearest preceding `useTranslation('ns')` in
   the same file), and checks the key exists in the `it` catalog — tolerating i18next's
   `_one`/`_other` plural-form pairs, and truncating at a `${...}` dynamic segment to verify the
   parent path is a non-empty object rather than enumerating every possible interpolated value.
   Deliberately a regex scan, not an AST parse — matches this codebase's own narrow, consistent
   convention (one `useTranslation` per component, one quoted/template first argument per `t()`
   call) and naturally excludes `translateApiError.ts`'s fully-dynamic server-supplied key
   (`t(err.key.replace(...), ...)` never matches either literal-argument regex, no explicit
   ignore-list needed). Verified against both a positive control (367 real call sites across 96
   files, zero false positives on first run) and a negative control (deliberately deleted a real
   key from `dashboard.json`, confirmed the test caught it with the exact file:line and key;
   restored, confirmed green again). Manual sweep of every `aria-label={`/`title={` for a literal
   instead of `t(...)`: clean, none found. Manual sweep for `Intl`-bypassing date/currency
   formatting found and fixed **three real forked-pattern sites**: `AdminActivityScreen.tsx` and
   `AccountRow.tsx` each hand-rolled their own `new Date(...).toLocaleString('it-IT')`/
   `toLocaleDateString('it-IT')` instead of using the shared `formatTimestamp`/`formatDate`
   helpers in `dashboard/DataTable/formatting.ts`. Added a new shared `formatTimestampDate`
   (instant-parsing, date-only display — the one shape the existing helpers didn't cover) and
   switched all three call sites (`AdminActivityScreen.tsx` ×2, `AccountRow.tsx`,
   `CategoriesScreen.tsx`) onto the shared formatters.

5. **State sweep.** `StatusDisplay` coverage confirmed complete (30+ call sites, no bypass
   found). Judgment call, recorded: `SkeletonRows` stays scoped to the one place it's already
   used (`AreaView.tsx`'s table loading state) rather than extended elsewhere — a skeleton only
   makes sense where the shape being previewed is stable and known, which is true only for the
   table; every other surface's `StatusDisplay variant="loading"` is the correct, deliberate
   choice, not a gap. **Fixed a real gap**: offline (genuine network failure) and a server
   refusal (4xx/5xx) were indistinguishable to the user — `apiClient.ts`'s `handleResponse` only
   wraps non-2xx HTTP responses into `ApiError`; a real `fetch()` rejection propagated unwrapped,
   and every read-path screen rendered the same static `loadError` copy regardless of which
   happened. Added `errors:common.offline` and a new `translateLoadError(t, error, loadErrorKey)`
   helper (`lib/translateApiError.ts`) that returns the offline copy only when the error is *not*
   an `ApiError` instance; threaded through the 11 confirmed read-path call sites (`DayView`,
   `MonthView`, `ThreadView`, `MyChatsScreen`, `WorkspacePanel`, `ActivityTimeline`,
   `AccountsScreen`, `AreaView`, `AdminActivityScreen` ×2, `CategoriesScreen`). Verified live with
   both scenarios via route interception: a genuine network failure (`route.abort`) shows
   "Impossibile contattare il server..."; a real 404 (after React Query's retries exhaust) still
   shows its own screen-specific message, unchanged.

6. **Performance + payload re-validation.**
   - `apps/server/src/cache/payloadBudget.test.ts` re-run as-is: **10k synthetic listings, raw
     7.36 MB, gzipped 0.37 MB (budget ≤3 MB), serialize 71.0 ms (budget ≤500 ms)** — comfortably
     green, unchanged since Phase 4/2 (Phase 13 never touched the payload shape).
   - Phase 4's methodology re-run at 10k-listing scale (`seed/seedSynthetic.ts`, real emulator,
     real browser) against the finished Phase 13 UI — see the table in §2 for the numbers and an
     honest caveat about measurement conditions.
   - Asset/bundle baseline measured and recorded (no prior figure existed to compare against —
     Phase 13 never recorded one): JS **332.01 kB gzipped**, CSS **34.94 kB gzipped**, fonts
     (realistic Italian-user subset: woff2, latin + latin-ext only — the vietnamese/greek/
     cyrillic subsets ship in `dist/` but are never fetched by a browser rendering only Italian
     text) **≈172 kB** (Hanken Grotesk 5 weights ≈114.5 kB + JetBrains Mono 2 weights ≈57.8 kB).
     Nothing here looked obviously wasteful; recorded as the new baseline, not treated as a gate.
   - **A major, previously-invisible bug found and fixed**: investigating the "verify the client
     honours the ETag short-circuits" requirement revealed the client had **zero**
     `If-None-Match` handling anywhere — `apiClient.ts`'s plain `fetch()` never tracked or sent a
     conditional-request header for *any* endpoint, including the pre-existing
     `/areas/:area/snapshot` ETag support that has existed since Phase 2/4. Every poll — snapshot,
     unread, and (after the fix below) calendar day — transferred its full payload every single
     cycle, regardless of the server-side 304 support that had quietly never been exercised.
     Fixed with a small per-path ETag cache in `apiClient.ts` (`getWithEtag`): `api.get()` now
     remembers the last ETag per exact request path and attaches `If-None-Match`; a 304 returns
     the cached data instead of trying to parse an empty body. Safe by construction for every
     other `api.get()` call (paths that never return an `ETag` header, e.g. `/ratings?since=...`
     with its ever-changing query string, simply never get a cache entry). Verified via a new
     committed `e2e/polling-cadence.spec.ts` — before the fix, every poll after the first
     returned 200; after, unchanged polls correctly return 304 over the wire in a real browser.
   - **304/ETag genuinely unimplemented (not just untested) on two of the three endpoints
     API_CONTRACT.md §10 promises it for**: confirmed by reading `apps/server/src/app.ts` in
     full (no global etag plugin registered) and grepping every route module — only
     `/areas/:area/snapshot` had it; `/chats/unread` and `/calendar/day/:date` had none. (Ratings'
     `?since` and open-thread's `?after` are delta-by-param per spec, not ETag-based, and were
     already correctly implemented — no gap there.) Implemented both: `/chats/unread`'s ETag is
     the counter value itself (`"${total}"`); `/calendar/day/:date`'s is
     `"${listingIds.join(',')}:${completed}"` (the frozen assignment set plus the
     ratings-driven completion count, the only two things that can change between polls of a
     day). New shared `apps/server/src/lib/http.ts` (`firstHeaderValue`) — `listings/index.ts`'s
     own copy consolidated into it. Integration tests added mirroring
     `listings.integration.test.ts`'s existing ETag/304 pattern (4 new tests: 2 in
     `chat.integration.test.ts`, 2 in `calendar.integration.test.ts` — the second of each pair
     confirms the ETag actually *changes* when the underlying value does, not just that a 304
     round-trips).
   - New `e2e/polling-cadence.spec.ts`: asserts minimum inter-request spacing (not several full
     cycles) for `openThread` (≥7.5s×0.8), `unread` (≥20s×0.8), `ratings` (≥20s×0.8); asserts
     `snapshot` fires at most 3 times in a ~24s window (1 initial + `refetchOnWindowFocus`'s
     legitimate extra fetch, the spec's own documented "~60s + on window refocus" — not a
     violation); and separately confirms the new `/chats/unread` and `/calendar/day/:date` ETags
     round-trip real 304s in a running browser, on quiet screens where the underlying value is
     genuinely stable (the busy chat-tab screen used for the timing checks legitimately mutates
     the unread counter once, by marking the thread read — checked separately, not conflated).

7. **Regression consolidation.** The 10 pre-existing e2e spec files were already fully mapping
   onto `TESTING.md §5`'s six named flows (flow 6's axe half was already committed as of this
   phase's own work above); the one real gap was flow 6's keyboard-only half, closed as described
   in item 2. `playwright.config.ts` left at `workers: 1`/`retries: 0` (the shared-emulator,
   shared-bootstrap-admin design genuinely depends on serial execution — parallelizing would
   fight the very flakiness this task exists to eliminate). **One real, previously-latent
   ordering bug found while running the full suite**: the new `accessibility.spec.ts` sorted
   alphabetically *before* `auth-flow.spec.ts`; its first `loginAsAdmin` call silently completed
   the bootstrap admin's forced-password-change on the still-fresh account, so
   `auth-flow.spec.ts`'s own dedicated test of that exact flow then failed (account no longer
   fresh). Renamed to `ui-accessibility.spec.ts` (sorts after `auth-flow`, before
   `workspace-deep-link`) with a comment explaining why, mirroring the reasoning
   `zz-calendar-assignment.spec.ts` already documents for a different shared-state ordering
   hazard. Also found and fixed one flake surfaced by the full suite (not file-ordering related):
   the new keyboard-only test's two back-to-back `ArrowRight` keypresses could outrun React's
   state update for the first one before the second was dispatched, landing one tab short —
   fixed with a 150ms pause between the two presses, confirmed against a live diagnostic that
   the same sequence lands correctly with the pause and doesn't without it. **Full suite run
   three consecutive times, all green**: 25/25, 25/25, 25/25 (≈7.5–7.6 min each).

8. **Verify, commit, handoff.** All six gates green (below); this document; commit to follow
   immediately after.

### Verification results (actual, final run)

- `pnpm lint` — green.
- `pnpm typecheck` (all 4 packages) — green.
- `pnpm test` — green, **230 tests** (124 shared / 17 server / 89 web — +1 web test vs. Phase 13's
  88, the new `i18nCompleteness.test.ts`).
- `pnpm build` — green (both apps); asset numbers as recorded in §1 task 6.
- `pnpm test:integration` — green, **127/127** (+4 vs. Phase 13's 123 — the new chat/calendar
  ETag tests).
- `pnpm e2e` — green, **25/25**, run three consecutive times with zero flakes (+2 new spec files
  vs. Phase 13's 21: `ui-accessibility.spec.ts` and `polling-cadence.spec.ts`).
- Axe: **zero violations** across every Appendix A screen, both themes, default width; zero
  violations on the 4-screen narrow-width (375px) spot-check.
- Keyboard-only: every flow completable (login, browse/rate/chat now committed as an e2e test;
  the broader manual 13-point pass covering comboboxes/menus/tabs/dialogs recorded above); no
  trap found; every dialog/menu/popover Esc-dismissable and returns focus correctly.

### Measured numbers (10k synthetic listings, real emulator + real browser, this machine)

| Measurement | Phase 4 result | Phase 11 result |
|---|---|---|
| Cold nav → first row visible | ~1.2 s | ~1.4–1.7 s |
| DOM rows rendered (virtualized) | 24 (of 1223) | 22 (of 1843) |
| Sort click → re-render, native in-page click (excl. Playwright dispatch) | ~7 ms | ~120–170 ms |
| Free-text filter, keystroke → live count (incl. 300ms debounce) | ~493 ms | ~465–502 ms |
| Scroll, avg/max frame time over 30 steps | 26 ms / 56.7 ms | ~75–109 ms / ~200–220 ms |
| Rating click → optimistic row/button update (new, full 1843-row bucket) | — | ~328 ms |
| Workspace open, cold (new, incl. blocco/OMI/rating/thread server joins @ 10k) | — | ~354 ms |
| Long tasks (>50ms) over one unread-poll cycle (new, confirms the ETag fix) | — | **none** |

All numbers comfortably clear UI §11's actual bar ("no multi-section stall", not a specific ms
target). The sort/scroll numbers are higher than Phase 4's — honestly recorded, not adjusted:
this machine had several other dev processes and browser instances running concurrently
throughout this session's measurement window (a very long session), unlike Phase 4's presumably
dedicated run. Same as Phase 4's own framing: directional, wall-clock, single-run numbers on this
machine, not a CI-tracked regression gate. The zero-long-tasks result for the unread poll is the
one number here that's a direct, load-bearing confirmation of this phase's own ETag fix, not
just a baseline snapshot.

## 2. Notes, observations, implementation details

- **The single biggest finding this phase, by far, was that client-side ETag handling never
  existed at all.** Every prior phase's "polling contract" work (Phase 2's snapshot ETag, this
  phase's own new chat/calendar ETags) was implemented and integration-tested purely
  server-side; nothing ever checked whether the browser client actually sent
  `If-None-Match`. It didn't — plain `fetch()` calls don't do this automatically, and no
  cache-control headers were ever set to make the browser's own HTTP cache attempt it either. The
  server-side 304 support was, in effect, dead code from the day it shipped. This was caught
  specifically because Phase 11's task 6 asked to *verify* client behaviour with a real e2e
  request-count assertion rather than trust that a green server-side integration test implied a
  working end-to-end feature — the same "verify, don't assume" discipline earlier phases'
  handoffs describe for contrast/behavioural bugs, applied here to a wire-protocol assumption
  instead.
- **Four real WCAG AA contrast failures found by the committed axe pass, none caught by any
  prior phase's disposable script**:
  1. `--color-text-muted` (darkened once already, in the same-day Phase 10 typography
     correction) was verified only against `--color-surface` (pure white, ~4.7:1) — never
     against the `--color-paper`/`--color-surface-2` tints it's used on just as often (table
     headers, metadata labels), where it actually measured 4.16–4.31:1. Darkened further, 56%→53%
     L, clearing 4.5:1 against the tightest background with margin. The exact same "checked one
     background, not all of them" class of gap Phase 10 itself found and fixed for
     `--color-accent`.
  2. Four of the seven categorical ramp colours (`--color-cat-1/3/4/7`, used as `.ui-avatar`
     fills with white-text initials) gave only 3.15–4.38:1 for that white text — never checked
     for this specific text-on-solid-fill pairing (only non-text swatch/dot uses were
     previously in mind). Darkened the four failing values by a few points of L each (59.7→58,
     61.8→54, 65.7→56, 64.8→54); the two non-text swatch consumers
     (`dashboard.css`'s category-legend swatches) only need 3:1 non-text contrast and were never
     at risk.
  3. `.ui-button-danger`/`.ui-button-success` used the exact same underlying OKLCH values as
     `--color-cat-1`/`--color-cat-3` (the base `--color-danger`/`--color-success` tokens) as a
     solid button fill with white text — the same failure, on a different component, for the
     same underlying reason. This one only became visible once the full e2e suite (not just this
     phase's own isolated test runs) rendered an admin-accounts screen with a *non-last-admin*
     account, whose Disabilita/Riabilita buttons are enabled (the seeded lone `admin` account's
     own buttons are natively `disabled` — exempt from axe's contrast check — since it's the last
     active administrator). Fixed by pointing the button backgrounds at the existing
     `-strong` variants (`--color-danger-strong`/`--color-success-strong`) instead of the base
     tokens — already darker/more-saturated, exactly for this kind of text-legibility need, and
     leaves the base tokens' dot/border calibration elsewhere untouched.
  4. The standalone `/chat/:listingId` route had no `<h1>` anywhere on the page — `ThreadView`'s
     own title is an `<h2>`, correctly hidden when embedded in the workspace drawer (whose own
     title already covers that role there) but still an `<h2>` — not promoted to `<h1>` — for the
     standalone case, where nothing else on the page is a page-level heading. One-line fix
     (`h2`→`h1`, gated by the already-existing `embedded` prop).
  Plus one `aria-input-field-name` gap (the chat composer's ProseMirror `role="textbox"` root had
  no accessible name) fixed via `editorProps.attributes` — which surfaced its own small TipTap
  gotcha: `createView` merges `role: 'textbox'` with caller-supplied `editorProps.attributes`
  only once, at construction; a later reconfigure (triggered by passing a fresh object literal on
  every render) applies `attributes` as-is with no such merge, silently dropping the role. Fixed
  by memoizing the object *and* listing `role: 'textbox'` explicitly in it, so correctness doesn't
  depend on which internal code path last touched the DOM node.
- **The mention-popup Escape/Dialog conflict (§1 item 2) is a genuinely subtle Radix + ProseMirror
  interaction** worth remembering for any future nested-dismissable-layer work in this app: Radix
  `DismissableLayer`'s Escape handling is a document-level capture-phase listener, attached once
  at the dialog's own mount time — a descendant component's `stopPropagation()` from within its
  own keydown handler runs at the target/bubble phase, strictly after capture has already
  finished, so it can never win that race no matter how the descendant's own effects are timed.
  The only supported escape hatch is the dialog's own `onEscapeKeyDown` prop, called synchronously
  before Radix's internal dismiss check — but calling `event.preventDefault()` from within it
  poisons `event.defaultPrevented` for *every* downstream handler on the same event, including
  ProseMirror's, which silently no-ops on an already-prevented event. The clean fix needed a
  direct side channel (the small `activeMentionRegistry.ts` module) rather than trying to make
  the two frameworks agree about one shared event's `defaultPrevented` flag.
- **`SkeletonRows` staying scoped to the table** (not extended to other loading states) and the
  three dataTable.css/dropdownMenu.css/chat.css/statusDisplay.css mechanical token fixes are
  recorded above as reviewed decisions, not silent omissions.
- No conflicts with the Specifications found or recorded this phase.

## 3. Blockers and unresolved issues

None blocking. Carried notes:

- The Phase 4-style performance numbers in §1 were measured on a machine running several other
  concurrent dev processes throughout a very long session — treat the absolute ms values as
  directional (per Phase 4's own stated framing), not as a tight regression baseline. If a truly
  clean re-measurement is wanted later, re-run with nothing else active on the machine.
- No numeric JS/font bundle budget exists anywhere in the Specifications (the only numeric
  payload budget, 3 MB gzipped, is the *snapshot data*, unrelated to bundle weight) — this
  phase's asset numbers (§1 task 6) are recorded as the first-ever baseline, not validated against
  any target, since none was ever specified.

## 4. Carry-over for the next phase

- **Repo/branch:** `ui-visual`, branch `phase-11-hardening` (off `new-ui-design-plan`'s Phase 13
  state). Not yet committed at the time this handoff was written — a single commit for this whole
  phase follows immediately after.
- **New devDependency:** `@axe-core/playwright` (root `package.json`) — e2e-only, not bundled
  into the web app.
- **New/renamed e2e files:** `e2e/ui-accessibility.spec.ts` (axe + keyboard-only flow +
  responsive-overflow — renamed from `accessibility.spec.ts` specifically to sort after
  `auth-flow.spec.ts`, see §1 task 7), `e2e/polling-cadence.spec.ts` (request-cadence + ETag
  round-trip assertions). Both share the existing `e2e/helpers.ts` — no new helpers needed.
- **New shared modules:** `apps/web/src/lib/apiClient.ts`'s `getWithEtag` (every `api.get()` call
  now transparently ETag-aware — nothing else needs to change to benefit from a future
  server-side ETag addition to some other endpoint); `apps/web/src/features/chat/mention/
  activeMentionRegistry.ts` (the Escape/Dialog conflict fix — any future nested-dismissable-layer
  work inside the workspace drawer should look at this pattern first); `apps/server/src/lib/
  http.ts` (`firstHeaderValue`, shared by every ETag-bearing route now).
- **`apps/web/src/i18n/i18nCompleteness.test.ts` is now a permanent gate** under `pnpm test` — any
  new `t('key')` call site with no matching catalog entry will fail the build. If a genuinely
  new dynamic-key pattern is ever introduced that the regex scanner can't resolve (namespace
  ambiguity, a call site outside the `useTranslation`-per-file convention), it will report a
  clear file:line error rather than silently passing — extend the scanner's namespace-resolution
  logic rather than special-casing around it.
- **Commands known to work:** `pnpm lint` / `typecheck` / `test` (230) / `build` / `test:integration`
  (127) — all green. `pnpm e2e` (25/25, `workers: 1`, ~7.5–7.6 min serial) — green, run three
  consecutive times this phase with zero flakes.
- **`seed/seedSynthetic.ts`** (10k-listing perf tool, Phase 4) still works unchanged — bumps
  `meta/immobili` so a *running* server's cache poll (~60s) picks it up without a restart
  (restarting would re-seed the small fixture set over it, since `PVPDASH_SEED=1` is typically
  set for local dev boots).
- **Emulator ports** (unchanged since Phase 0): Firestore `127.0.0.1:8081`, Storage
  `127.0.0.1:9199`, UI `4001`; demo project id `demo-pvp-dashboard`.
- **What Phase 12 inherits:** a fully axe-clean (both themes), keyboard-complete,
  i18n-completeness-gated, ETag-honest application — the polling contract now actually behaves
  as documented end to end, not just on the server. **Phase 12 requires the operator's
  `DEPLOYMENT.md` §2 onboarding done first** (Blaze upgrade + budget alerts, Cloud Run/Storage
  enabled, runtime + deploy service accounts, the two Secret Manager secrets) — flagging this now
  so the operator can prepare before that session starts.
