# Frontend — Architecture, Routing, Design System

> Companion document to [`SPECIFICATIONS.md`](SPECIFICATIONS.md), expanding §9: how `apps/web` is organized, the URL contract that delivers the deep-linking requirement, the data layer, the table strategy, theming with the Hallmark workflow, and i18n. Behavioural references (UI §x) point to [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md).

## 1. Application structure

```
apps/web/src/
├── app/                # bootstrap: router, providers (Query, i18n, theme), auth guard, shell (user menu, badges)
├── components/         # shared hand-styled UI primitives (Button, TextInput, Tabs, Dialog) over Radix UI
├── features/
│   ├── auth/           # login screen, forced password change, session boot
│   ├── dashboard/      # landing, area view, cluster sections, tables, toolbar, drill-down, OMI panel
│   ├── workspace/      # the listing workspace panel: details, rating, related lots, history, chat tab
│   ├── ratings/        # rating cell + shared rating state (used by dashboard, workspace, calendar)
│   ├── chat/           # thread view, compose (rich text + attach), Le mie chat, unread badge
│   ├── calendar/       # month view, day view
│   ├── archive/        # Archivio section, same-session moves, svuota flow
│   └── admin/          # accounts, categories, calendar assignment, events, runs
├── i18n/               # locales/it/<namespace>.json, i18next setup
├── theme/              # tokens.css (Hallmark output: light + dark token sets)
└── lib/                # api client (typed fetch over shared schemas), poll cadences, formatting (Intl it-IT)
```

Feature folders own their components, hooks, and route definitions; cross-feature reuse goes through `components/`, `ratings/`, and `lib/` — not deep imports between features. Domain logic is **never** re-implemented here: classification arrives pre-computed in the snapshot, and any client-side rule (same-session archive, §11-DOMAIN_RULES) is imported from `packages/shared`.

## 2. Routing map and URL-state contract

TanStack Router, typed routes, **typed + validated search params** (Zod schemas from `packages/shared`). The rule: **anything the UI spec calls linkable or restorable lives in the URL; nothing else does.** Unknown/invalid params fall back to defaults silently (a stale link must never error).

| Path | Screen | Search params |
|---|---|---|
| `/login` | Sign-in (UI §2.1) | `redirect` (the originally requested URL) |
| `/` | Landing — *Scegli una vista* (UI §2.2) | — |
| `/aste/:area` | Area view; `area` ∈ `immobili` \| `crediti` | `cluster` (local number or `archivio`), `tab` (`principali` \| `fallimenti`), `regione`, `capoluogo`, `provincia`, `q`, `tipo`, `procedura`, `disponibilita`, `tribunale`, `min`, `max`, `blocco`, `sort`, `dir` |
| `/aste/:area/lotto/:id` | Area view **with the workspace open** on listing `id` (UI §4.5) | area params **plus** `pannello` (`dettagli` \| `storico` \| `chat`) |
| `/calendario` | Month view (UI §7.1) | `mese` (`YYYY-MM`) |
| `/calendario/:date` | Day view (UI §7.2) | workspace params when opened from here |
| `/chat` | *Le mie chat* (UI §6.3) | — |
| `/chat/:listingId` | Standalone chat thread (UI §6.2) — same component the workspace embeds | — |
| `/admin` | Accounts (UI §8.1) | — |
| `/admin/categorie` | Extraction categories (UI §8.2) | — |
| `/admin/calendario` | Assignment: random / by-id / removal (UI §8.3) | `tab` |
| `/admin/attivita` | Admin events + scraper runs | — |

Notes binding on the implementation:

- **The workspace is a route**, not ephemeral state — `/aste/immobili/lotto/12345?pannello=chat` reproduces table + open panel + chat tab exactly (the "chat associated with a procedure" deep link). Closing the panel navigates back to `/aste/:area` preserving the search params.
- **Area slugs are Italian** (`immobili`, `crediti`) because they are user-visible URLs; the API keeps the storage scopes (`immobili`, `corporate`) — the mapping constant lives in `packages/shared`.
- Browser **back/forward** traverses cluster/tab/filter states (UI §2.4) because they are search-param changes; in-place updates use `replace` only for keystroke-level changes (free-text `q` debounced then pushed).
- The auth guard wraps everything except `/login`; a `401` redirects to `/login?redirect=<current>` and returns after sign-in (UI §2.1). While `must_change_password` is set, all routes render the forced-change screen (§2-API_CONTRACT enforces server-side).

## 3. Data layer

- **TanStack Query** with query keys mirroring the API paths; the §10-API_CONTRACT polling cadences configured per key (`refetchInterval`, `refetchOnWindowFocus`).
- **Snapshot join:** tables render `snapshot rows ⋈ ratings map` — the two arrive on different clocks (`SPECIFICATIONS.md` §8) and are joined in a selector, so a rating change re-renders rows without touching the big dataset.
- **Mutations are optimistic** where the UI spec demands immediacy (rating set/clear, message send): apply locally, fire the request, reconcile on the next poll; on failure, roll back and toast the translated error key.
- **Filtering/sorting/search run client-side** over the in-memory snapshot slice (the dataset is already fully delivered; the toolbar operates instantly and offline from Firestore's perspective). The filter model is one Zod-typed object derived from the URL — the single source the table, the live count, and *Reset filtri* all read.

## 4. Tables at scale

- A **custom virtualized table** — semantic `<table>` markup with `@tanstack/react-virtual`'s `useVirtualizer` for row windowing — carries the thousands-of-rows requirement (UI §11), not pagination (the UI spec has no pages). (The table was custom from the start: PrimeReact 11 shipped no working virtualized table.)
- Row identity by listing id; memoized row rendering; the Valutazione cell and row actions (workspace, quick chat) rendered in a **frozen column** so they stay reachable under horizontal scroll (UI §4.1).
- Column sets per table kind (real estate / credits / archive / calendar day) are declarative configs over one table component — the UI §4.1 show/hide matrix in one file.
- Sorting implements the UI §4.2 rules exactly (nulls-lowest for value, chronological for dates, block identity for Blocco) via comparators from `packages/shared`.

## 5. Design system: tokens, hand-styled Radix, Hallmark

- **Tokens first.** The **Hallmark** design skill (installed by the developer with `npx skills add nutlope/hallmark`, landing in `.agents/skills/hallmark/` — never installed by copying the folder) produces the project's design foundations — palette, type pairing, spacing scale, radius/shadow/elevation stance — emitted as CSS custom properties in `apps/web/src/theme/tokens.css`. Tokens are the single source: no raw hex/font literals in components (lint-enforced).
- **Hand-styled Radix primitives.** UI primitives are **Radix UI** headless components (tabs, dialog) plus plain `<button>`/`<input>`, styled by hand with plain CSS that consumes the tokens directly — no component-library theme layer, no CSS-in-JS. The shared primitives live in `apps/web/src/components/`; per-feature `.css` files hold surface-specific styling, all against the same tokens. (This replaced PrimeReact, whose styled preset system required a commercial license — Execution Plan Phase 9.)
- **Modern-enterprise language + dark mode.** The visual language is modern enterprise — a clean **blue/white** palette — with **full dark mode**: a `:root[data-theme="dark"]` token set overrides the light custom properties, driven by a theme toggle (default: OS `prefers-color-scheme`; the explicit choice persisted). Both themes live entirely in the token layer.
- **Hallmark cadence:** the design system is defined and applied in a dedicated `redesign` pass (Execution Plan Phase 10) and re-audited (`audit`) during hardening (Phase 11), after earlier per-surface passes (Phases 4, 6, 7). Its anti-slop gates (structural variety, no italic headers, token discipline, 8-state interactive components, mobile floors) are part of the quality bar, not decoration.

## 6. Internationalization

- **react-i18next**, default and only initial locale `it`; one namespace per feature (`auth`, `dashboard`, `workspace`, `chat`, `calendar`, `admin`, `archive`, `common`, `errors`).
- **No literal user-facing strings in components** — enforced by an ESLint rule (`react/jsx-no-literals` scoped to JSX text + a review gate for attribute strings). Interpolation and plurals through i18next; no string concatenation of translated fragments.
- **Server error keys** (`API_CONTRACT.md` §1) resolve in the `errors` namespace; a missing key falls back to a generic message (and logs in dev).
- **Dates, numbers, currency** format via `Intl` with `it-IT` (euro formatting per UI §4.1); the locale constant sits beside the i18n setup, ready for switching.
- Italian domain words that are product vocabulary (*Blocco*, *Fallimenti*, *Archivio*, cluster names) are still translation entries — the catalog is complete even where only one locale exists.

## 7. Cross-cutting UI obligations

Implementation stances for UI §11, fixed here so they are built in, not retrofitted:

- **Keyboard & ARIA:** cluster nav and bucket tabs are a `tablist`; the user menu a `menu` with expanded state; the workspace panel and confirmation dialogs are modal `dialog`s (Radix `Dialog` — focus trap, `aria-modal`, and `Esc` close are native); every interactive element focusable with visible focus ring (token-defined).
- **Reduced motion:** all transitions behind a `prefers-reduced-motion` guard in the token layer.
- **Responsive:** tables scroll inside their own container (`overflow-x: auto`); the page body never scrolls horizontally; calendar and admin are width-capped and centred; toolbars wrap.
- **Empty/loading/error states** are designed states with copy in the catalog — never blank panels or raw error text.
- **Easter eggs** (UI Appendix B): the €5M confirmation and the Roccaraso/L'Aquila dialogs are ordinary modal dialogs (Radix `Dialog`) behind constants in `packages/shared` (threshold, province, comune) — themed content is a Phase 11 (hardening) concern; the media they present ships bundled (no external hosts).
