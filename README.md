# pvp-dashboard

Web application with which a small investment team reviews **Italian judicial
auctions** (_Portale delle Vendite Pubbliche_): an Italian-language, auth-gated
dashboard that classifies every upcoming auction into risk clusters, shows
official OMI price context, and lets the team rate listings, discuss them in
per-listing chats, and work through daily assigned calendars.

It reads a **shared Cloud Firestore** database kept current by a separate,
already-running scraper project; this app reads it (and writes only its own
collections) through a Fastify API. See [`docs/`](docs/) for the full spec.

## Stack

TypeScript monorepo (pnpm workspaces):

- **apps/web** — React + PrimeReact SPA (Vite, TanStack Router/Query, react-i18next)
- **apps/server** — Fastify + Zod API; the only Firestore client (Firebase Admin SDK)
- **packages/shared** — Zod schemas + pure domain rules, imported by both apps

## Quickstart

```bash
# 1. Install
pnpm install

# 2. Configure (local dev)
cp .env.example .env         # then edit values

# 3. Start the Firestore + Storage emulators (needs a Java runtime)
pnpm emulators

# 4. Seed the fixture dataset into the emulators (from Phase 1+)
#    PVPDASH_SEED=1 on dev startup, or run the seed script directly.

# 5. Run the apps (separate terminals)
pnpm dev:server              # Fastify API  → http://localhost:8080
pnpm dev:web                 # Vite SPA      → http://localhost:5173

# 6. Test
pnpm test                    # offline unit suites (no emulator, no network)
pnpm test:integration        # emulator suites (require FIRESTORE_EMULATOR_HOST)
```

## Quality gates

`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:integration` ·
`pnpm build` · `pnpm e2e` — see [`docs/specifications/TESTING.md`](docs/specifications/TESTING.md).

## Documentation

- Specifications — [`docs/specifications/`](docs/specifications/)
- Interface behaviour — [`docs/FUNCTIONAL_SPECIFICATIONS_UI.md`](docs/FUNCTIONAL_SPECIFICATIONS_UI.md)
- Build workflow (phases) — [`docs/execution-plan/00_OVERVIEW.md`](docs/execution-plan/00_OVERVIEW.md)
