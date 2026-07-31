# Design — pvp-dashboard

Locked design system for `pvp-dashboard` (an Italian-language, auth-gated
dashboard for reviewing judicial auctions). First written by the Hallmark
`redesign` skill's multi-page/app flow (Execution Plan Phase 10, theme
"Cobalt"); **superseded in Phase 13** by the project owner's Claude Design
reference (`PVP Aste Dashboard.dc.html`, project
`9a6a3659-ac8c-4d46-9b8f-06abe620f442`) — the same token architecture, a new
navy/blue voice. Future design passes read this file first; every surface
defers to it — consistency across surfaces is the goal here, not per-page
variety. Amend intentionally; the file is the rule.

## System

- **Genre** · modern-minimal (a dense B2B/enterprise tool, not a marketing
  site — Hallmark's editorial/atmospheric/playful menu doesn't apply here).
- **Macrostructure** · one family, **Workbench**, with two archetypes:
  - **Data-dense** — area view, admin tables, calendar month/day: sticky
    header, dense rows, toolbar-above-content, tabular-nums.
  - **Panel/form** — workspace panel, admin forms, auth screens, chat:
    card-on-paper, generous label/input spacing, single-column flow.
    (Not three page-type families — this app has no marketing/content pages,
    only application surfaces; splitting by page-type would manufacture a
    distinction that doesn't exist.)
- **Theme** · reference-derived custom: **Navy Ledger** (Phase 13) — cool
  near-white paper, a deep-navy brand anchor (`--color-brand`, headings /
  logo / the one filled "brand" button per screen) and a steady mid-blue
  working accent (`--color-accent`, links / active states / primary row
  actions). Two blues with distinct jobs, not one signal colour: navy is
  identity, blue is interaction. Supersedes Cobalt's single electric signal.
- **Axes** · paper-band: light (+ a genuine dark set) / display-style:
  single-family humanist sans (**Hanken Grotesk**, both display and body) /
  accent-hue: cool blue (~252°) over blue-grey neutrals (~265–269°).

## Tokens (canonical · `apps/web/src/theme/tokens.css` is the source of truth)

This project's own token names (established Phase 0; Phase 13 changes
values, adds the brand/categorical/soft-status groups, never renames).
`paper` is the page background, `surface` a raised card/panel — the app
deliberately keeps them separate. Values are the reference palette converted
to OKLCH, then contrast-corrected where the mockup's raw hexes fail WCAG AA
(muted text, status text on tint — see Notes).

```css
:root {
  /* Light — reference anchors */
  --color-paper: oklch(97.3% 0.006 265); /* #f4f6fa */
  --color-surface: oklch(100% 0 0); /* cards, table, app bar */
  --color-surface-2: oklch(96.1% 0.007 269); /* fills, idle inputs */
  --color-border: oklch(92.8% 0.013 267); /* #e3e7f0 */
  --color-border-soft: oklch(95.2% 0.008 271); /* row/section dividers */
  --color-border-strong: oklch(83% 0.026 266); /* hover borders */
  --color-text: oklch(24.4% 0.035 265); /* #182031 ink */
  --color-text-body: oklch(47.9% 0.032 269); /* #565d70 */
  --color-text-muted: oklch(56% 0.028 269); /* mockup grey darkened for AA */

  /* Brand (identity): navy — headings, logo tile, the brand button */
  --color-brand: oklch(26.9% 0.083 269); /* #16224e */
  --color-brand-strong: oklch(31.5% 0.099 269); /* #1d2c63 hover */
  --color-brand-fill: var(--color-brand); /* button fill (dark differs) */
  --color-brand-fill-contrast: oklch(99% 0.004 255);

  /* Accent (interaction): blue — links, active, primary actions */
  --color-accent: oklch(50.8% 0.132 252); /* #2167ae */
  --color-accent-strong: oklch(42.2% 0.107 252); /* #184f86 */
  --color-accent-soft: oklch(95.6% 0.015 257); /* #eaf1fb tint fills/chips */
  --color-accent-contrast: oklch(99% 0.004 255);
  --color-focus: oklch(50.8% 0.132 252);

  /* Status — base for dots/borders, -strong for text on -soft tints */
  --color-success: oklch(61.8% 0.13 161); /* #1f9d6b */
  --color-success-strong: oklch(52% 0.11 161);
  --color-success-soft: oklch(95.9% 0.017 163); /* #e8f5ee */
  --color-warning: oklch(63.7% 0.14 68); /* #c27803 */
  --color-warning-strong: oklch(50% 0.11 68);
  --color-warning-soft: oklch(96% 0.03 86); /* #fbf1dc */
  --color-danger: oklch(59.7% 0.182 25); /* #d64545 */
  --color-danger-strong: oklch(50% 0.15 25);
  --color-danger-soft: oklch(95.1% 0.019 17); /* #fbeaea */
  --color-info: var(--color-accent);

  /* Categorical ramp — cluster dots, avatar fills (index-stable) */
  --color-cat-1: oklch(59.7% 0.182 25); /* red */
  --color-cat-2: oklch(50.8% 0.132 252); /* blue */
  --color-cat-3: oklch(61.8% 0.13 161); /* green */
  --color-cat-4: oklch(65.7% 0.028 269); /* grey */
  --color-cat-5: oklch(30.6% 0.021 269); /* graphite */
  --color-cat-6: oklch(54.9% 0.247 291); /* violet */
  --color-cat-7: oklch(64.8% 0.13 232); /* cyan */

  --font-display: 'Hanken Grotesk', system-ui, sans-serif;
  --font-body: 'Hanken Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;

  /* 4-pt spacing scale: --space-0 … --space-16. See tokens.css. */
  /* Type scale: --text-xs … --text-2xl. See tokens.css. */

  --radius-sm: 6px;
  --radius-md: 9px; /* buttons / inputs (reference: 8–10px) */
  --radius-lg: 14px; /* cards / panels */
  --radius-xl: 16px; /* hero cards (landing) */
  --radius-pill: 999px;

  --shadow-1: 0 1px 2px oklch(26.9% 0.083 269 / 0.06);
  --shadow-2: 0 4px 16px oklch(26.9% 0.083 269 / 0.08);
  --shadow-pop: 0 16px 40px oklch(26.9% 0.083 269 / 0.16); /* popovers/menus */
  --shadow-drawer: -18px 0 50px oklch(26.9% 0.083 269 / 0.2);

  /* One stacking scale — floating layers must not fight. Popovers and menus
     are portalled to <body>, so they need to clear the drawer or a picker
     opened inside it renders behind its own trigger. */
  --z-header: 40;
  --z-drawer: 1000;
  --z-popover: 1100;
  --z-modal: 1200;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 0.15s;
  --dur-pop: 0.14s; /* popover/menu entrance */
  --dur-slide: 0.24s; /* drawer entrance */
  --dur-base: 0.3s;
}

/* Dark (kept from Phase 10's architecture; re-derived for the navy anchors:
   hue channels preserved, lightness inverted, chroma tuned; navy becomes
   *ink* in dark — headings — so filled brand buttons take a distinct
   --color-brand-fill. Every pair re-verified against WCAG AA. */
:root[data-theme='dark'] {
  --color-paper: oklch(20% 0.012 265);
  --color-surface: oklch(24% 0.014 265);
  --color-surface-2: oklch(28% 0.016 265);
  --color-border: oklch(34% 0.016 265);
  --color-border-soft: oklch(30% 0.014 265);
  --color-border-strong: oklch(44% 0.018 265);
  --color-text: oklch(95% 0.006 260);
  --color-text-body: oklch(87% 0.01 262);
  --color-text-muted: oklch(70% 0.02 265);

  --color-brand: oklch(88% 0.04 265);
  --color-brand-strong: oklch(93% 0.03 265);
  --color-brand-fill: oklch(38% 0.09 268);
  --color-brand-fill-contrast: oklch(96% 0.01 260);

  --color-accent: oklch(70% 0.11 252);
  --color-accent-strong: oklch(76% 0.1 252);
  --color-accent-soft: oklch(31% 0.05 254);
  --color-accent-contrast: oklch(16% 0.02 260);
  --color-focus: oklch(70% 0.11 252);

  --color-success: oklch(72% 0.14 161);
  --color-success-strong: oklch(80% 0.12 161);
  --color-success-soft: oklch(30% 0.05 161);
  --color-warning: oklch(76% 0.14 78);
  --color-warning-strong: oklch(84% 0.11 80);
  --color-warning-soft: oklch(30% 0.05 80);
  --color-danger: oklch(70% 0.17 25);
  --color-danger-strong: oklch(80% 0.12 22);
  --color-danger-soft: oklch(30% 0.06 22);

  --color-cat-1: oklch(70% 0.17 25);
  --color-cat-2: oklch(70% 0.11 252);
  --color-cat-3: oklch(72% 0.14 161);
  --color-cat-4: oklch(72% 0.024 269);
  --color-cat-5: oklch(80% 0.02 269);
  --color-cat-6: oklch(70% 0.18 291);
  --color-cat-7: oklch(74% 0.11 232);

  --shadow-1: 0 1px 2px oklch(0% 0 0 / 0.3);
  --shadow-2: 0 4px 16px oklch(0% 0 0 / 0.45);
  --shadow-pop: 0 16px 40px oklch(0% 0 0 / 0.5);
  --shadow-drawer: -18px 0 50px oklch(0% 0 0 / 0.55);
}
```

## Micro-label voice (Phase 13)

The reference's structural signature: **11px / 700 / uppercase / +0.4px
tracking / `--color-text-muted`** labels for form-field labels, table column
headers, KV-metadata keys, and popover section headers — one shared CSS
pattern (`.field-label` and equivalents), never ad-hoc. Body copy, buttons,
menu items, and data values stay sentence-case; the uppercase voice is
reserved for _labels of things_, not things themselves. (This intentionally
reverses the Phase 10 no-uppercase correction — see Notes.)

## CTA voice

- **Brand** · filled `--color-brand-fill`, one per screen at most (the page's
  single decisive action: refresh, login, error retry).
- **Primary** · filled `--color-accent`, `--radius-md` (row/section primary
  actions: "Apri scheda", send, save).
- **Tinted** · `--color-accent-soft` fill, `--color-accent-strong` text
  (secondary-but-branded: "Vai all'annuncio ↗", "+ Aggiungi").
- **Secondary** · outlined (`--color-border` border, `--color-surface` fill),
  darkens to `--color-border-strong` on hover.
- **Ghost/pill** · transparent with pill radius (chip-row actions:
  "⟳ Reset filtri").
- **Icon** · 34px square, outlined (overflow "⋯", close "×").

## Motion stance

- Silent, functional motion only — no celebratory reveals. `--ease-out` for
  state transitions.
- Named entrances (defined once in `tokens.css`): `pvp-fade` (view mount,
  250ms), `pvp-pop` (popover/menu, `--dur-pop`), `pvp-slide` (drawer,
  `--dur-slide`), `pvp-up` (mention popup), `pvp-shimmer` (skeleton),
  `pvp-spin` (busy spinner).
- Reduced-motion fallback: everything ships static and fully visible
  (already enforced globally in `tokens.css`'s `prefers-reduced-motion`
  media query).

## Per-surface allowances

- Every surface uses the Workbench macrostructure; it picks the **data-dense**
  or **panel/form** archetype per its own content shape (see System above).
- No enrichment tier (hero art, illustration, generated imagery) anywhere —
  this is an internal tool with no marketing surface; function carries every
  screen.
- Icons: one locked set (Lucide, `lucide-react`) — no per-surface icon-style
  drift, **no emoji as icons** (the FASE 10.5 emoji prefixes are superseded).

## What every surface MUST share

- The logo block (CSS-drawn navy tile with three bars + "PVP Aste /
  Dashboard" wordmark — a temporary placeholder mark, one implementation in
  the Shell, reused by auth screens), always a link to `/` ("Scegli una
  vista" is the homepage).
- The brand/accent split and each colour's job (navy = identity, blue =
  interaction).
- The type family: **Hanken Grotesk, one family, display and body** — plus
  the micro-label voice above as the only sanctioned uppercase use.
- The primitive voice established in `apps/web/src/components/`: Button,
  TextInput, PasswordInput, Tabs (underline style), Dialog, ConfirmDialog,
  Popover, DropdownMenu, SearchSelect, SelectField, Badge, Chip, Avatar,
  Skeleton, StatusDisplay — no hand-rolled duplicates of any of these.
- The focus-ring token (`--color-focus`, 2px solid, 2px offset).
- One elevation scale: `--shadow-1`/`--shadow-2` for resting surfaces,
  `--shadow-pop` for floating layers, `--shadow-drawer` for the workspace
  panel (dark mode raises opacity, same geometry) — and one **stacking**
  scale (`--z-header` < `--z-drawer` < `--z-popover` < `--z-modal`); no
  surface invents its own `z-index` for a floating layer.
- No browser-native `alert`/`confirm`/`prompt`: confirmations use
  `ConfirmDialog`, single-value asks use `PromptDialog`.
- The shared `StatusDisplay`/`Skeleton` primitives for every
  loading/empty/error/success state (no bespoke per-feature status text).

## What surfaces MAY differ on

- Which Workbench archetype (data-dense vs panel/form) a screen uses.
- Per-surface layout specifics within the archetype (e.g. the calendar's grid
  vs the dashboard's virtualized table — both "data-dense," different
  content shape).

## Exports

`apps/web/src/theme/tokens.css` is the source of truth and the only format
the build actually consumes (plain CSS custom properties — no Tailwind,
no CSS-in-JS). The blocks below are portability artifacts only, for reuse in
another project; translated from the same OKLCH values above using this
project's own token names.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(97.3% 0.006 265);
  --color-surface: oklch(100% 0 0);
  --color-surface-2: oklch(96.1% 0.007 269);
  --color-border: oklch(92.8% 0.013 267);
  --color-text: oklch(24.4% 0.035 265);
  --color-brand: oklch(26.9% 0.083 269);
  --color-accent: oklch(50.8% 0.132 252);
  --color-focus: oklch(50.8% 0.132 252);

  --font-display: 'Hanken Grotesk', system-ui, sans-serif;
  --font-body: 'Hanken Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;

  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;

  --radius-md: 9px;
  --radius-lg: 14px;
  --radius-pill: 999px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(97.3% 0.006 265)", "$type": "color" },
    "surface": { "$value": "oklch(100% 0 0)", "$type": "color" },
    "border": { "$value": "oklch(92.8% 0.013 267)", "$type": "color" },
    "text": { "$value": "oklch(24.4% 0.035 265)", "$type": "color" },
    "brand": { "$value": "oklch(26.9% 0.083 269)", "$type": "color" },
    "accent": { "$value": "oklch(50.8% 0.132 252)", "$type": "color" },
    "focus": { "$value": "oklch(50.8% 0.132 252)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Hanken Grotesk, system-ui, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Hanken Grotesk, system-ui, sans-serif", "$type": "fontFamily" },
    "mono": { "$value": "JetBrains Mono, ui-monospace, monospace", "$type": "fontFamily" }
  },
  "space": {
    "1": { "$value": "0.25rem", "$type": "dimension" },
    "4": { "$value": "1rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 97.3% 0.006 265; /* paper */
  --foreground: 24.4% 0.035 265; /* text */
  --card: 100% 0 0; /* surface */
  --card-foreground: 24.4% 0.035 265;
  --primary: 50.8% 0.132 252; /* accent */
  --primary-foreground: 99% 0.004 255; /* accent-contrast */
  --secondary: 96.1% 0.007 269; /* surface-2 */
  --muted: 92.8% 0.013 267; /* border */
  --muted-foreground: 56% 0.028 269; /* text-muted */
  --border: 92.8% 0.013 267;
  --input: 92.8% 0.013 267;
  --ring: 50.8% 0.132 252; /* focus */
  --radius: 9px; /* radius-md */
}

.dark {
  --background: 20% 0.012 265;
  --foreground: 95% 0.006 260;
  --card: 24% 0.014 265;
  --card-foreground: 95% 0.006 260;
  --primary: 70% 0.11 252;
  --primary-foreground: 16% 0.02 260;
  --secondary: 28% 0.016 265;
  --muted: 34% 0.016 265;
  --muted-foreground: 70% 0.02 265;
  --border: 34% 0.016 265;
  --input: 34% 0.016 265;
  --ring: 70% 0.11 252;
}
```

## Notes

- **Phase 13 supersedes Cobalt.** The project owner supplied a Claude Design
  reference (`PVP Aste Dashboard.dc.html`) as the primary visual/UX target.
  Its palette (navy `#16224e`, blue `#2167ae`, blue-grey neutrals),
  typography (Hanken Grotesk), and structural voice (uppercase micro-labels,
  pill badges, popover elevation) replace Cobalt's single-cobalt-signal
  system. The token _architecture_ — OKLCH, light + `data-theme='dark'`,
  names, reduced-motion guard — is unchanged from Phase 10.
- **The uppercase micro-label reversal is intentional and user-confirmed**
  (Phase 13 planning session, 2026-07-31). Phase 10 removed all
  uppercase/tracked labels on operator feedback (Apple/Zurich references);
  the new reference's identity is built on them, and the operator chose to
  follow the reference. The Phase 10 note is retained below for history, but
  the micro-label voice section above is now the rule.
- **Contrast corrections over the raw mockup hexes** (same discipline as
  Phase 10's axe fix): the mockup's muted greys (`#8a91a3` 3.15:1,
  `#a2a8b8` 2.38:1 on white) fail AA for the 11px-bold micro-labels they're
  used on — `--color-text-muted` is set at oklch 56% L (≈4.7:1) instead;
  status text on soft tints (`#1f9d6b` on `#e8f5ee` 3.07:1, amber 3.13:1,
  red 3.77:1) gets the `-strong` variants (≈4.8–5.3:1) for text use, while
  the base status colours remain for dots/borders (non-text, 3:1 domain).
  White-on-accent (5.81:1) and white-on-navy (15.3:1) pass as-is.
- Dark mode has no mockup — the dark set above derives from the light
  anchors under Phase 10's rules (hue preserved, lightness inverted, chroma
  tuned, pairs verified). Navy cannot be a fill in dark (it _is_ the ink
  band), hence the `--color-brand` (ink) vs `--color-brand-fill` (button)
  split.
- The logo is a **temporary placeholder** (owner: "it will be replaced
  later") — drawn in CSS, no binary asset, one implementation.
- _Historical (Phase 10, superseded where it conflicts with the above):_
  Cobalt anchors, Inter single-family, the no-uppercase rule and its
  Apple/Zurich rationale, `--color-accent` 58%→55% L axe fix. See git
  history of this file and `HANDOFF_PHASE_10.md`.
