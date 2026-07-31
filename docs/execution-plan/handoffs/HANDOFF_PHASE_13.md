# Handoff — Phase 13: UX Redesign (Claude Design reference adoption)

- **Phase:** 13 — UX Redesign: Claude Design Reference Adoption
- **Date:** 2026-07-31
- **Outcome:** complete

## 1. Completed

All ten tasks of [`PHASE_13_UX_REDESIGN.md`](../PHASE_13_UX_REDESIGN.md), in nine commits on `new-ui-design-plan`.

1. **Docs first.** `design.md` amended to the reference-derived **Navy Ledger** system (theme, token table, micro-label voice, CTA voices, motion stance, stacking scale, "no native dialogs"); `00_OVERVIEW.md` §6 gained the Phase 13 row and the ordering note (0 → 10, then 13, then 11 → 12).
2. **Foundations.** `theme/tokens.css` rewritten in place — every token *name* preserved, values replaced by the reference palette converted to OKLCH. Added: brand group (`--color-brand`, `-strong`, `-fill`, `-fill-contrast`), `--color-border-soft`, status `-strong`/`-soft` completions, categorical ramp `--color-cat-1…7`, `--label-*`, `--shadow-pop`/`--shadow-drawer`, `--radius-xl`, `--dur-pop`/`--dur-slide`, the `--z-*` stacking scale, and the `pvp-fade/pop/slide/up/shimmer/spin` keyframes (all under the existing reduced-motion guard). Font swapped Inter → Hanken Grotesk (`@fontsource/hanken-grotesk`, 400–800).
3. **Primitives.** Added `@radix-ui/react-popover`, `@radix-ui/react-dropdown-menu`, `@tiptap/suggestion`. New shared components: `Popover`, `DropdownMenu`, `SearchSelect` (ARIA combobox), `SelectField`, `Field`, `Badge`, `Chip`, `Avatar`/`AvatarStack`, `Skeleton`/`SkeletonRows`, `ConfirmDialog`, `PromptDialog`, plus the single underline-tab voice in `components/tabs.css`. Extended `Button` (brand/tinted/ghost voices, icon size) and `StatusDisplay` (centered block layout).
4. **Shell + landing.** Clickable CSS-drawn logo → `/`, route-aware breadcrumb, avatar user pill on the shared `DropdownMenu`. Landing: update badge, hero heading, view cards with live counts.
5. **Dashboard restructure.** Cluster pill-row → searchable `ClusterSelect` combobox with Archivio pinned; region chips → combobox in the same selector toolbar with capital chips + province select as progressive disclosure; OMI panel as a soft card; underline bucket tabs flush on the filter card; labelled filters + active-filter chip row; table rebuilt (stacked Anno/N°, Tipo·Tribunale identity cell with read-only rating dot, right-aligned Valore, uppercase headers, row-click opens the scheda, `Apri scheda` + portalled overflow menu). Skeleton/empty/error states.
6. **Drawer + chat.** 480px slide-in workspace (focus-return fix untouched), identity kicker, shared underline tabs with chat badge, KV grid, tinted CTA, railed timeline. Participants → avatar stack + search popover; TipTap `@`-mention that inserts a bold mention **and** adds the participant; Enter-to-send with Shift+Enter for a new paragraph; bubble message layout.
7. **Secondary surfaces.** Auth (logo + brand submit), calendar (card grid, pill day badges), admin (bespoke tab style deleted in favour of the shared tabs; micro-label headers/labels). Every emoji removed from copy across all nine i18n namespaces.
8. **States, dark, layering.** Motion applied via the named keyframes; light + dark captured on every principal surface with a temporary Playwright harness (21 surfaces × 2 themes + two narrow-viewport shots) and reviewed. Four real defects were found and fixed that way — the popover/drawer stacking bug, the table's column budget overflowing its container, a duplicated title in the drawer's chat tab, and count-interpolated copy with no Italian plural forms (see §2).
9. **Specs + tests.** `FUNCTIONAL_SPECIFICATIONS_UI.md` (§2.3, §2.5, §3.1, §3.2, §4.1, §4.2, §4.5, §5, §6.1, §6.2, §9.2, §9.3, §11) and `FRONTEND.md` (§1, §4, §5, §7) updated for every sanctioned behaviour change. `RatingControl.test.tsx` and seven e2e specs updated; two new e2e tests added (row-click opens the scheda; the @-mention flow).

**Verification (actual results, final run):**

- `pnpm lint` (eslint + prettier) — green.
- `pnpm typecheck` — green.
- `pnpm -F @pvp/web test` — **88 passed / 9 files**. The pure-logic suites (`urlState`, `blocco`, `sessionArchive`, `drilldownHelpers`, `filterModel`) passed **unchanged** throughout, which is the evidence that the URL contract and the filter/archive/blocco rules were not touched.
- `pnpm e2e` — **21 passed / 0 failed** on the final run. Requires the Firebase emulators; Chromium had to be installed once with `npx playwright install chromium`.

## 2. Notes, observations, implementation details

- **Contrast corrections over the raw mockup.** The reference's muted greys fail AA at the sizes it uses them (`#8a91a3` = 3.15:1 on white, `#a2a8b8` = 2.38:1), and its status-on-tint pairs sit at ~3:1. `--color-text-muted` was darkened to ~4.7:1 and `-strong` status variants added for text on the soft tints; base status colours stay for dots/borders. Reasoning recorded in `design.md` Notes.
- **Navy cannot be both ink and fill.** In dark mode the brand navy becomes the heading ink, so filled brand buttons take a separate `--color-brand-fill`. This is the one place the light/dark sets are not a straight inversion.
- **Layering defect found by e2e, fixed with a token scale.** Popovers/menus were at `z-index: 50` while the workspace drawer is at 1000/1001 — and Radix portals them to `<body>`, so the participants picker opened *inside* the drawer rendered **behind** it and was unclickable. Same class of bug would have hit any confirmation raised from the drawer. Fixed by introducing `--z-header/-drawer/-popover/-modal` and routing every floating layer through it. No surface should hard-code a `z-index` for a floating layer again.
- **Toolbar buttons were stealing editor focus.** With the mention plugin installed, `editor.chain().focus()` no longer restored DOM focus after a toolbar click, so everything typed afterwards was lost (and a stray Enter could send a half-written message). Fixed properly rather than worked around: the toolbar buttons `preventDefault()` on mousedown, so the editor never loses focus and the selection survives the click — which is also the correct behaviour for applying a mark to a selection.
- **Mention candidates are fetched lazily**, so the fetch can resolve *after* the picker opened. `items()` is called once by the suggestion plugin, so the picker would have shown a stale list; `RichTextEditor` now owns the filtering and re-pushes items into an open picker when the pool changes, and the fetch starts on first editor focus rather than on first `@`.
- **Enter-to-send needed Shift+Enter to split blocks**, not insert a hard break — otherwise a bullet list could not be started after a paragraph. The extension carries `priority: 1000` so it outranks StarterKit's own Enter/Shift-Enter bindings; inside a list Enter deliberately falls through to its default meaning.
- **Rating placement is not uniform, on purpose.** Dashboard and archive rows show a read-only dot and rate from the drawer (the owner's decision). The **calendar day view keeps its in-row control**: that screen is a rate-through worklist and its scheda link navigates to the area view, so drawer-only rating would have meant leaving and re-entering the calendar once per listing — a real regression the e2e suite caught. Recorded in UI §5.
- **`@tiptap/core` is not a direct dependency**; `@tiptap/react` re-exports it (`export * from '@tiptap/core'`), so `Extension` is imported from there.
- **Filters stayed native `<select>`s** (styled). They give mobile pickers for free and keep `getByLabel(...).selectOption(...)` working. Note that an active filter now also renders a chip whose remove button is labelled *"Rimuovi filtro «Nome»"*, so `getByLabel('Tribunale')` is ambiguous — specs must pass `{ exact: true }`.
- **`box-sizing: border-box` is now global** (`tokens.css`). There was no reset, so a declared width was the content box and padding was added on top — which is how the table's column budget silently overflowed and pushed *Valore richiesto* and both date columns under the frozen actions column at 1440px. The column widths were rebudgeted to fit (1206px of data + 166px actions) and the date headers shortened to *Pubblicazione* / *Vendita*, as the reference itself has them.
- **Italian plurals.** Count-interpolated copy read "1 righe", "1 annunci assegnati". Every such string now has `_one`/`_other` forms (dashboard `svuotaConfirm`/`bloccoBadgeTitle`, admin assignment/removal results, workspace related-lots, chat participants). One e2e assertion changed with it (`1 annuncio assegnato.`).
- **Native dialogs are gone from `apps/web`**: archive refresh/svuota, chat close, the three admin confirmations, and the composer's link prompt all use `ConfirmDialog`/`PromptDialog`. `grep -rn "window.alert\|window.confirm\|window.prompt" apps/web/src` returns only comments.

## 3. Blockers and unresolved issues

None blocking. Carried notes:

- `.admin-onward-link-disabled` in `admin.css` is unreferenced dead CSS that **predates** this phase; left alone rather than removed as an unrelated change.
- The visual pass was done from full-viewport captures of every principal surface in both themes (a temporary Playwright harness, not committed). Phase 11 still owns the systematic a11y/responsive verification — in particular an **axe run in both themes**, which this phase did not execute.
- Dark mode has no reference: its values are derived from the light anchors under the Phase 10 rules and reviewed on the captures, not against a supplied design.

## 4. Carry-over for the next phase

- **Branch:** `new-ui-design-plan`, on top of `962bbc5` ("FASE 10.5"). Phase 13 adds nine commits, each one work package, each independently green on lint/typecheck/unit.
- **Commands known to work:** `pnpm lint`, `pnpm typecheck`, `pnpm -F @pvp/web test`, `pnpm e2e`.
  - `pnpm e2e` needs the **Firebase emulators**, and on this machine it must run **outside the tool sandbox** (inside it, the emulator cannot bind its ports and fails with "Could not start Firestore Emulator, port taken" even though nothing holds them).
  - Chromium is installed via `npx playwright install chromium` — a one-time step that was missing here.
- **New e2e helpers** in `e2e/helpers.ts` — `selectCluster`, `selectRegion`, `openRowChat`, `openUserMenuItem`, `clickExpectingConfirm`. Use them rather than re-deriving the combobox/menu/dialog interaction sequences. `clickExpectingConfirm` scopes to `.ui-confirm` on purpose: the drawer and every popover are also `role="dialog"`.
- **Design system:** `design.md` is the rule; `apps/web/src/theme/tokens.css` is the source of truth. Every pattern (menu, popover, combobox, badge, chip, avatar, skeleton, confirm/prompt, tabs) has exactly one implementation in `apps/web/src/components/` — extend those rather than adding a per-feature variant.
- **For Phase 11 (Hardening), which runs next:** verify on the *redesigned* UI — axe in both themes, keyboard-only passes over the new combobox/menu/mention interactions, the reduced-motion guard against the new keyframes, responsive floors (the shell hides the breadcrumb under 30rem; the selector toolbar and filter fields wrap), and the payload impact of the new Radix packages and the Hanken Grotesk faces.
