# Design — pvp-dashboard

Locked design system for `pvp-dashboard` (an Italian-language, auth-gated
dashboard for reviewing judicial auctions). Written by the Hallmark
`redesign` skill's multi-page/app flow (Execution Plan Phase 10). Future
Hallmark runs read this file first; every surface defers to it — consistency
across surfaces is the goal here, not per-page variety. Amend intentionally;
the file is the rule.

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
- **Theme** · catalog-adjacent custom: **Cobalt**, the anchor Phase 0 already
  established (cool near-white paper, one electric-cobalt signal, hue ~256°)
  — kept and systematized, not replaced, because it already satisfies the
  brief's "blue and white" ask.
- **Axes** · paper-band: light (+ a genuine dark set) / display-style:
  grotesk-sans (Space Grotesk headings) / accent-hue: cool blue (~256°).

## Tokens (canonical · `apps/web/src/theme/tokens.css` is the source of truth)

This project's own token names (established Phase 0, unchanged in spirit —
Hallmark's abstract `paper/paper-2/paper-3` maps onto this app's existing
`surface`/`surface-2` + `paper` distinction, which the app deliberately keeps
separate: `paper` is the page background, `surface` is a raised card/panel).

```css
:root {
  /* Light (unchanged anchors from Phase 0) */
  --color-paper: oklch(98.5% 0.004 250);
  --color-surface: oklch(100% 0 0);
  --color-surface-2: oklch(96.5% 0.006 250);
  --color-border: oklch(90% 0.008 252);
  --color-border-strong: oklch(84% 0.01 254);
  --color-text: oklch(24% 0.02 258);
  --color-text-body: oklch(34% 0.018 257);
  --color-text-muted: oklch(52% 0.016 256);
  --color-accent: oklch(55% 0.2 256);
  --color-accent-strong: oklch(52% 0.2 256);
  --color-accent-soft: oklch(95% 0.03 256);
  --color-accent-contrast: oklch(99% 0.004 250);
  --color-focus: oklch(55% 0.2 256);

  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;

  /* 4-pt spacing scale: --space-0 … --space-16. See tokens.css. */
  /* Type scale: --text-xs … --text-2xl. See tokens.css. */

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-pill: 999px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 0.15s;
  --dur-base: 0.3s;
}

/* Dark (new — Phase 10). Same hue channels as light, lightness inverted,
   chroma tuned so large surfaces don't read muddy and the accent stays
   vivid rather than graying out. Every pair re-verified against WCAG AA
   (4.5:1 body text, 3:1 large text/UI), not assumed from the formula. */
:root[data-theme='dark'] {
  --color-paper: oklch(20% 0.01 258);
  --color-surface: oklch(24% 0.012 258);
  --color-surface-2: oklch(28% 0.014 258);
  --color-border: oklch(34% 0.014 256);
  --color-border-strong: oklch(42% 0.016 256);
  --color-text: oklch(95% 0.006 250);
  --color-text-body: oklch(88% 0.008 252);
  --color-text-muted: oklch(68% 0.012 254);
  --color-accent: oklch(68% 0.19 256);
  --color-accent-strong: oklch(74% 0.18 256);
  --color-accent-soft: oklch(30% 0.05 256);
  --color-accent-contrast: oklch(14% 0.02 258);
  --color-focus: oklch(68% 0.19 256);
}
```

Status colours (`--color-success`/`--color-warning`/`--color-danger`) keep
their light-mode hues and lighten ~10–14% L in dark mode, same hue, chroma
unchanged or nudged +0.01–0.02 — see `tokens.css` for the exact pairs. Two
tint tokens added for the shared `StatusDisplay` primitive's soft
backgrounds, following `--color-accent-soft`'s existing pattern:
`--color-success-soft` / `--color-danger-soft` (light: high-L low-C tint;
dark: low-L low-C tint — same derivation the accent-soft pair already uses).

## CTA voice

- **Primary** · filled `--color-accent`, `--radius-md`, the existing
  `Button` component's default padding rhythm (`components/button.css`).
- **Secondary** · outlined (`--color-border-strong` border, `--color-surface`
  fill), same radius, same padding rhythm — never a different shape.

## Motion stance

- Silent, functional motion only — no celebratory reveals; this is a data
  tool, not a marketing surface. `--ease-out` for state transitions.
- Reduced-motion fallback: ≤150ms opacity crossfade (already enforced
  globally in `tokens.css`'s `prefers-reduced-motion` media query).

## Per-surface allowances

- Every surface uses the Workbench macrostructure; it picks the **data-dense**
  or **panel/form** archetype per its own content shape (see System above).
- No enrichment tier (hero art, illustration, generated imagery) anywhere —
  this is an internal tool with no marketing surface; function carries every
  screen.
- Icons: one locked set (Lucide, `lucide-react`) — no per-surface icon-style
  drift.

## What every surface MUST share

- The wordmark (`PVP Aste Dashboard`, text-only — no logo asset supplied).
- The accent colour and its ≤5%-of-viewport placement rule.
- The type pairing (Space Grotesk display / Inter body / JetBrains Mono for
  labels and tabular data).
- The Button / TextInput / PasswordInput / Tabs / Dialog voice established in
  `apps/web/src/components/` (Phase 9).
- The focus-ring token (`--color-focus`, 2px solid, 2px offset).
- One elevation scale (`--shadow-1`/`--shadow-2` in light; border-forward,
  raised-opacity shadow in dark — see Tokens above).
- The shared `StatusDisplay` primitive for every loading/empty/error/success
  state (no bespoke per-feature status text).

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
  --color-paper: oklch(98.5% 0.004 250);
  --color-surface: oklch(100% 0 0);
  --color-surface-2: oklch(96.5% 0.006 250);
  --color-border: oklch(90% 0.008 252);
  --color-text: oklch(24% 0.02 258);
  --color-accent: oklch(55% 0.2 256);
  --color-focus: oklch(55% 0.2 256);

  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;

  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;

  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-pill: 999px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(98.5% 0.004 250)", "$type": "color" },
    "surface": { "$value": "oklch(100% 0 0)", "$type": "color" },
    "border": { "$value": "oklch(90% 0.008 252)", "$type": "color" },
    "text": { "$value": "oklch(24% 0.02 258)", "$type": "color" },
    "accent": { "$value": "oklch(55% 0.2 256)", "$type": "color" },
    "focus": { "$value": "oklch(55% 0.2 256)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk, system-ui, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Inter, system-ui, sans-serif", "$type": "fontFamily" },
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
  --background: 98.5% 0.004 250; /* paper */
  --foreground: 24% 0.02 258; /* text */
  --card: 100% 0 0; /* surface */
  --card-foreground: 24% 0.02 258;
  --primary: 55% 0.2 256; /* accent */
  --primary-foreground: 99% 0.004 250; /* accent-contrast */
  --secondary: 96.5% 0.006 250; /* surface-2 */
  --muted: 90% 0.008 252; /* border */
  --muted-foreground: 52% 0.016 256; /* text-muted */
  --border: 90% 0.008 252;
  --input: 90% 0.008 252;
  --ring: 55% 0.2 256; /* focus */
  --radius: 6px; /* radius-md */
}

.dark {
  --background: 20% 0.01 258;
  --foreground: 95% 0.006 250;
  --card: 24% 0.012 258;
  --card-foreground: 95% 0.006 250;
  --primary: 68% 0.19 256;
  --primary-foreground: 14% 0.02 258;
  --secondary: 28% 0.014 258;
  --muted: 34% 0.014 256;
  --muted-foreground: 68% 0.012 254;
  --border: 34% 0.014 256;
  --input: 34% 0.014 256;
  --ring: 68% 0.19 256;
}
```

## Notes

- Dark mode is genuinely new (Phase 10) — no prior dark tokens existed
  anywhere in the app. The dark values above are a first pass verified
  against WCAG AA contrast pairs during this phase's verification step, not
  an untested formula.
- No logo/photography asset supplied by the project owner — the wordmark
  stays text-only (`PVP Aste Dashboard`). Icons come from one locked
  open-source set (Lucide) rather than per-surface emoji or hand-drawn SVG.
- **`--color-accent` moved 58%→55% L, found and fixed via this phase's own
  axe courtesy pass**, not assumed: the original 58% L gave
  accent-contrast-on-accent (every primary button's text) 4.26:1, under
  WCAG AA's 4.5:1 for normal-size text — axe flagged it live across six of
  the ten screens checked. 55% clears it at 4.83:1 (verified the same way
  as the dark-mode pairs). Dark mode's accent (68% L) already passed at
  6.83:1 and is unchanged. A 3-point L shift reads as imperceptible, not a
  hue change — `--color-accent-strong`/`--color-accent-soft` untouched.
