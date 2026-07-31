# Repository Structure — Target Layout and Phase Inventory

> Companion to [`00_OVERVIEW.md`](00_OVERVIEW.md): the target file layout of the `pvp-dashboard` monorepo and which phase creates each part. Names are binding at the level shown; file-local organization inside a module is the implementing session's freedom (note non-obvious choices in the handoff).

## 1. Target tree

```
pvp-dashboard/
├── package.json                  # workspace root: scripts (lint, typecheck, test, test:integration, e2e, build)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js              # incl. the no-literal-strings i18n rule
├── .prettierrc
├── .gitignore                    # .env, *.local, service-account JSON, dist, node_modules
├── .env.example                  # every CONFIGURATION.md variable
├── README.md                     # quickstart: install, emulators, seed, dev, test
├── docs/                         # ← this documentation set, moved in unchanged by Phase 0
│   ├── FUNCTIONAL_SPECIFICATIONS_UI.md
│   ├── specifications/           # SPECIFICATIONS, DATA_MODEL, DOMAIN_RULES, API_CONTRACT,
│   │                             #   FRONTEND, CONFIGURATION, TESTING, DEPLOYMENT
│   ├── execution-plan/           # this folder, incl. handoffs/ (filled as phases run)
│   └── RUNBOOK.md                # written by Phase 12
├── .agents/
│   └── skills/hallmark/          # Hallmark design skill — installed in Phase 0 via `npx skills add nutlope/hallmark` (never copied in)
├── apps/
│   ├── web/
│   │   ├── index.html  vite.config.ts  package.json  tsconfig.json
│   │   └── src/
│   │       ├── app/              # router, providers, auth guard, shell (user menu, unread badge)
│   │       ├── components/       # shared Radix-based UI primitives (Button, Tabs, Dialog, …)
│   │       ├── features/
│   │       │   ├── auth/  dashboard/  workspace/  ratings/  chat/  calendar/  archive/  admin/
│   │       ├── i18n/             # setup + locales/it/<namespace>.json
│   │       ├── theme/            # tokens.css (Hallmark output: light + dark)
│   │       └── lib/              # typed api client, cadences, Intl formatting
│   └── server/
│       ├── package.json  tsconfig.json
│       └── src/
│           ├── index.ts          # bootstrap: config validation, plugins, modules, listen
│           ├── config.ts         # Zod-validated env (CONFIGURATION.md)
│           ├── plugins/          # session/cookie, error envelope, request logging, multipart
│           ├── modules/
│           │   ├── auth/  listings/  ratings/  activity/  chat/  attachments/
│           │   ├── calendar/  admin/  settings/  health/
│           ├── repositories/     # firestore access per collection; Part A strictly read-only
│           └── cache/            # snapshot builder + meta poller (SPECIFICATIONS.md §8)
├── packages/
│   └── shared/
│       ├── package.json  tsconfig.json
│       └── src/
│           ├── schemas/          # Zod: Part A docs, Part B docs, API payloads
│           ├── domain/           # DOMAIN_RULES.md as pure functions
│           ├── constants/        # clusters, exclusions, catalog, bands, cadences
│           └── index.ts
├── firebase/
│   ├── firebase.json             # emulators (firestore, storage), hosting config + rewrites
│   ├── firestore.rules           # deny-all (production stance)
│   ├── firestore.indexes.json    # DATA_MODEL.md §16
│   └── storage.rules             # deny-all
├── seed/
│   ├── fixtures/                 # TESTING.md §7 dataset (one JSON per collection)
│   └── seed.ts                   # loads fixtures into the emulators
├── e2e/                          # Playwright config + specs
└── deploy/
    ├── Dockerfile                # apps/server production image
    └── deploy.sh                 # gcloud run deploy + firebase deploy scripts
```

## 2. What each phase creates or completes

| Phase | Creates / completes |
|---|---|
| 0 | Repo root (workspace, tooling, lint, `.env.example`, `.gitignore`, README), `docs/`, `.agents/skills/hallmark/`, `apps/web` skeleton (Vite + PrimeReact + router/query/i18n providers, `theme/tokens.css`, PrimeReact preset stub *(removed in Phase 9)*, AI CLI plugin installed), `apps/server` skeleton (config, plugins, `modules/health/`), `packages/shared` stub, `firebase/firebase.json` (emulators) |
| 1 | `packages/shared` in full: `schemas/`, `domain/`, `constants/`; `seed/fixtures/`; the §2-TESTING unit suites |
| 2 | `apps/server`: `repositories/`, `cache/`, `modules/listings/`, `modules/settings/` (read side); `seed/seed.ts`; `firebase/firestore.indexes.json`; integration-suite harness |
| 3 | `apps/server`: `modules/auth/`, `modules/admin/` (accounts + events); `apps/web`: `features/auth/`, `app/` shell + guard; `features/admin/` (accounts screen) |
| 4 | `apps/web`: `features/dashboard/` (landing, area view, cluster sections, tables, toolbar), `lib/` api client + URL-state; snapshot endpoint wiring |
| 5 | `features/dashboard/` drill-down + OMI panel + blocco behaviours; `features/archive/`; `features/admin/` categories screen; `modules/settings/` write side |
| 6 | `features/workspace/`, `features/ratings/`; `modules/ratings/`, `modules/activity/`; `GET /listings/:id` + activity endpoints |
| 7 | `modules/chat/`, `modules/attachments/`; `features/chat/`; storage emulator wiring; unread counters |
| 8 | `modules/calendar/`; `features/calendar/`; admin assignment screens |
| 9 | `apps/web/src/components/` (shared Radix primitives); PrimeReact removed everywhere; `theme/preset.ts` deleted — behaviour- and appearance-preserving |
| 10 | `theme/tokens.css` rewritten (light + dark token sets); theme toggle in the shell; every surface restyled to the modern-enterprise design system |
| 11 | No new areas — audits and fixes across `apps/web`, `e2e/` consolidated regression, payload/perf assertions |
| 12 | `deploy/`, `firebase/` production values, `docs/RUNBOOK.md` |

## 3. Never committed

`.env` and any real environment values; service-account JSON keys; `node_modules/`, `dist/`, build output; emulator data directories; Playwright traces/screenshots except failures kept deliberately; anything from Secret Manager.
