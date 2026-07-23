# Phase 10 — Deployment, Go-Live, Runbook (Operator-Supervised)

> Goal: production — the server container on Cloud Run, the SPA on Firebase Hosting, deny-all security rules deployed and verified, the production bootstrap, a live round-trip of every write path against the real shared database, and the operator runbook with a drill. This is the only phase that touches production. Part of the Execution Plan — read [`00_OVERVIEW.md`](00_OVERVIEW.md) and follow its session protocol.

## Preamble (assume zero prior context)

You are building **`pvp-dashboard`**: the web application with which a small investment team reviews Italian judicial auctions — a React + PrimeReact SPA over a Fastify + Zod API mediating a shared Cloud Firestore database kept current by a separate scraper project. The application is feature-complete and hardened (Phases 0–9), entirely on emulators so far. This session puts it in front of the team: same Google Cloud project as the database, Hosting + Cloud Run per [`../specifications/DEPLOYMENT.md`](../specifications/DEPLOYMENT.md), with the operator present — the scraper keeps running throughout and must be entirely unaffected.

**State when this phase starts:** Phases 0–9 complete with all gates green — see `HANDOFF_PHASE_0..9.md`. No Dockerfile, no deploy scripts, no production rules deployed, no production accounts exist.

## Required reading

- [`../specifications/DEPLOYMENT.md`](../specifications/DEPLOYMENT.md) — all of it (this phase executes it)
- [`../specifications/CONFIGURATION.md`](../specifications/CONFIGURATION.md) — §1 (production-required variables), §2 (knobs)
- [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md) — §8 (`max-instances = 1` rationale), §15 (logs/probes)
- [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) — §1 (what must remain untouched), §16 (indexes to deploy)

## Entry criteria

1. `HANDOFF_PHASE_9.md` outcome `complete`; all gates green at the inherited commit.
2. The operator has completed `DEPLOYMENT.md` §2: Blaze + budget alerts, Cloud Run/Artifact Registry/Storage enabled, runtime + deploy service accounts created, `PVPDASH_SESSION_SECRET` and `PVPDASH_BOOTSTRAP_ADMIN_PASSWORD` in Secret Manager. If any item is missing, stop: handoff `blocked` naming the item.
3. The operator is present for the session (receives the bootstrap credential, approves the first deploy).

## Tasks

1. **Container** (`deploy/Dockerfile`): multi-stage pnpm build → slim Node runtime, non-root, `NODE_ENV=production`, honouring Cloud Run's `PORT`; build and run it locally against the emulators as a smoke.
2. **Deploy scripts** (`deploy/deploy.sh` + `firebase/firebase.json` production values): Cloud Run deploy (`europe-west8`, `--max-instances 1`, min instances per the operator's choice, secrets mounted, runtime SA), Hosting deploy with the SPA and `/api/**` rewrites, and the rules/indexes deploy (`firestore:rules,firestore:indexes,storage`).
3. **Deploy in the `DEPLOYMENT.md` §4 order:** rules → verify with a client-SDK read attempt on `listings` and a direct Storage GET (both must be refused) → server (verify `/readyz` goes ready and the snapshot log line shows real counts) → hosting.
4. **Production bootstrap:** first sign-in as the bootstrap admin (operator receives the credential out-of-band), forced password change, create the real team accounts (operator dictates), remove `PVPDASH_BOOTSTRAP_ADMIN_PASSWORD` from the service configuration.
5. **Live verification, every write path once, with the operator:** browse both areas against real data (counts vs the §10.1 header; spot-check an OMI panel against a known province); rate a listing and clear it; open its chat, send a rich-text message with an attachment, download it; verify the unread badge on a second account; open today's calendar (real assignment of 18); admin: assign one listing by id, remove it; save the extraction-category selection **after recording its current value**, verify `updated_by`, then restore the recorded value. Confirm in the Firestore console that no scraper-owned document changed beyond `settings/extraction_categories`.
6. **Runbook** (`docs/RUNBOOK.md`): deploy + rollback procedures (Cloud Run revision, Hosting release), log queries (request lines, cache rebuild lines), the staleness model ("data old? check the scraper's runs via the admin screen first"), probe endpoints, secret rotation, budget-alert response, and the definition-of-done checklist mirroring this phase's verification.
7. **Drill:** roll back the Cloud Run service one revision and forward again; simulate a bad deploy (readiness never green — e.g. a missing env var) and confirm traffic stayed on the old revision; verify a budget-alert email path is configured.
8. **Verify, commit, handoff.**

## Verification

- The production URL serves the app over HTTPS; sign-in, and every §5-task flow, worked live — witnessed by the operator.
- Security rules verified denying direct client access to Firestore and Storage.
- `/readyz` green; Cloud Logging shows request lines with ids and the snapshot rebuild with real counts.
- The scraper's collections untouched (console check + the next scheduled scraper run completes normally — confirm with the operator the following day if the window allows; otherwise record it as the one open follow-up).
- Rollback drill performed; runbook checklist complete and accurate against what was actually done.

## Constraints

- **This phase must not disturb the scraper**: no changes to its service account, its rules expectations (it uses the Admin SDK — deny-all does not affect it), or its collections. The extraction-category exercise in task 5 is restore-to-recorded-value, operator-approved.
- Production writes happen **only** through the deployed application in task 5 — no console edits, no scripts against production.
- Secrets exist only in Secret Manager and the operator's head; nothing lands in the repo, the image, or the logs.
- If go-live cannot complete, leave production in a coherent state (rules deployed is safe on its own), record precisely where it stopped, and end `partial`.

## Handoff

Write `docs/execution-plan/handoffs/HANDOFF_PHASE_10.md` from the template. This is the project-closing record: the production URLs, service/revision identifiers, where each secret lives, the accounts created (usernames only), the live-verification results, the drill outcomes, any open follow-ups (e.g. next-day scraper-run confirmation) — and a final note pointing future work at `SPECIFICATIONS.md` §19 (the deferred refresh trigger first among them).
