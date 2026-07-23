# Deployment — Production Topology and Operator Guide

> Companion document to [`SPECIFICATIONS.md`](SPECIFICATIONS.md), expanding §18. The production shape, the operator's one-time onboarding, the security-rules stance, and the cost posture. The Execution Plan's Phase 10 executes this document and turns its checks into the operator runbook.

## 1. Topology

```
Browser ──▶ Firebase Hosting (static SPA, CDN)
              │  rewrite /api/** ─▶ Cloud Run service `pvp-dashboard-api` (europe-west8, max-instances=1)
              │                        │ Admin SDK (runtime service account)
              │                        ▼
              │                  Cloud Firestore (shared with the scraper)  +  Firebase Storage (attachments)
              └─ SPA rewrite: /** → /index.html
```

- **Same Google Cloud project as the database** (the `pvp-aste-…` project the scraper writes to): one console, one billing scope, and the Hosting→Cloud Run rewrite keeps the app same-origin — cookies are first-party, no CORS surface.
- **Region `europe-west8`** for Cloud Run, beside the data.
- **`max-instances = 1`** is a correctness setting (the in-process snapshot cache, `SPECIFICATIONS.md` §8), not a budget one. **`min-instances`** is the operator's latency/cost knob: `0` = scale-to-zero with cold starts of a few seconds (and a cache re-prime); `1` ≈ a few €/month for an always-warm instance. Start at `0`; revisit with usage.
- The container serves the API only; static assets never pass through Cloud Run.

## 2. Operator onboarding (one-time, before Phase 10's deploy)

The scraper project's operator already owns the Firebase project; this adds:

1. **Blaze plan.** Firebase console → project → Upgrade → Blaze (pay-as-you-go). Required by Cloud Run and Storage. Immediately create a **budget** (Google Cloud console → Billing → Budgets): e.g. €10/month with alerts at 50/90/100% to the operator's email. Expected steady-state cost at this scale: ≈ €0–2/month.
2. **Enable services:** Cloud Run API, Artifact Registry (or use source deploys), Firebase Storage (create the default bucket, `europe-west8`).
3. **Service accounts, least privilege:**
   - *Runtime* SA for the Cloud Run service: roles `roles/datastore.user` and `roles/storage.objectAdmin` **scoped to the attachments bucket** (plus `roles/iam.serviceAccountTokenCreator` on itself for signed URLs). The scraper's SA is untouched and unshared.
   - *Deploy* SA (or the operator's account) for CI/manual deploys: Cloud Run admin + Hosting admin.
4. **Secrets** (`PVPDASH_SESSION_SECRET`, `PVPDASH_BOOTSTRAP_ADMIN_PASSWORD`) go in **Secret Manager**, mounted as env vars on the service — never in images, never in the repo.

## 3. Security rules — deny all, verified

The Admin SDK bypasses security rules; nothing else may pass. Ship and deploy:

`firebase/firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

`firebase/storage.rules`: the same deny-all for the bucket.

**Verification is part of go-live** (and of the runbook drill): an unauthenticated client SDK read of `listings` and a direct Storage object GET must both be refused. Note for coordination: the scraper project historically kept permissive rules for its emulator work — **production** rules are this project's responsibility and deploying deny-all does not affect the scraper (Admin SDK).

## 4. Build and deploy

- **Server:** multi-stage `deploy/Dockerfile` (pnpm install → build `packages/shared` + `apps/server` → slim runtime image, non-root user, `NODE_ENV=production`). Deploy: `gcloud run deploy pvp-dashboard-api --region europe-west8 --max-instances 1 …` (scripted in `deploy/`).
- **Frontend:** `pnpm --filter web build` → `firebase deploy --only hosting` with `firebase/firebase.json` carrying the SPA rewrite and the `/api/**` → Cloud Run rewrite.
- **Rules/indexes:** `firebase deploy --only firestore:rules,firestore:indexes,storage`.
- **Order on first go-live:** rules → server (with secrets set) → verify `/readyz` → hosting → bootstrap admin sign-in and forced password change → live smoke (Phase 10's checklist).
- **Rollback:** Cloud Run keeps prior revisions (`gcloud run services update-traffic`); Hosting keeps prior releases (console one-click). Both are part of the runbook.

## 5. Operations

- **Logs:** Cloud Logging, filter by service; every request line carries request id + user id (`SPECIFICATIONS.md` §15). Cache rebuild lines are INFO with counts — the first thing to check when "data looks stale".
- **Staleness model:** dashboard data is as fresh as the scraper's last run + one `meta` poll interval; the UI's §10.1 header is the user-visible truth. If the header is old, the scraper side is the place to look — its own `runs` collection (admin screen) says what happened.
- **Probes:** Cloud Run readiness on `/readyz`, liveness on `/healthz`.
- **Cost watch:** the budget alerts (§2) plus a monthly glance at Billing → Reports; the read/write profile is designed to be near-zero (`SPECIFICATIONS.md` §8) — a cost spike is a defect signal, not a scaling milestone.
- **Secret rotation:** new session secret → deploy → all sessions invalid (users sign in again); bootstrap password variable should already be removed after first use.

## 6. The deferred refresh trigger (v1.1 sketch)

When the UI §10.2 control is built: this application writes `refresh_requests/{scope}` (`requested_by`, `requested_at`, `status: pending`); the scraper gains a small polling entry point that claims the request, runs the scope, and updates `status`/progress fields on the same document; the UI polls it for the §10.2 progress line. Costs and lifecycle exactly as sketched in the scraper project's own extensibility notes; requires a coordinated change there, which is why it is not v1.
