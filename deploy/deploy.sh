#!/usr/bin/env bash
# Production deploy for pvp-dashboard (Execution Plan Phase 12, DEPLOYMENT.md §4).
# Operator-supervised: run step by step during go-live so each stage can be
# verified before the next, in the required order:
#
#   ./deploy/deploy.sh rules     # deny-all Firestore/Storage rules + indexes
#     → verify: a direct client read of `listings` and a Storage GET are BOTH refused
#   ./deploy/deploy.sh server    # Cloud Run (Fastify API), secrets from Secret Manager
#     → verify: /readyz is 200 and the boot log shows the snapshot rebuild with real counts
#   ./deploy/deploy.sh hosting   # build the SPA + Firebase Hosting (rewrites /api/** → Cloud Run)
#     → verify: the production URL serves the app over HTTPS; sign-in works
#
#   ./deploy/deploy.sh all       # rules → server → hosting in order (non-interactive)
#
# Nothing here touches the scraper (deny-all does not affect the Admin SDK it
# uses). Secrets never appear in this file, the image, or the logs — they live
# only in Secret Manager and are mounted as env vars on the service.
set -euo pipefail

# --- Configuration (override via env at go-live) ------------------------------
PROJECT="${PVPDASH_PROJECT:-pvp-aste}"
REGION="${PVPDASH_REGION:-europe-west8}"
SERVICE="${PVPDASH_SERVICE:-pvp-dashboard-api}"
# The runtime service account email (created in DEPLOYMENT.md §2): the Cloud Run
# service runs AS this identity (datastore.user + storage.objectAdmin on the
# attachments bucket + token creator on itself). REQUIRED for `server`.
RUNTIME_SA="${PVPDASH_RUNTIME_SA:-}"
# Slack member ID mentioned by the pratiche notifications (CONFIGURATION.md).
# Not a secret — a member ID identifies, it does not authorize. Defaulted here
# rather than left to the caller because --set-env-vars REPLACES the whole set:
# a deploy that forgot it would silently switch the notifications off, with no
# error anywhere. The webhook itself is a secret and lives in Secret Manager.
SLACK_MENTION_ID="${PVPDASH_SLACK_MENTION_ID:-U07JR3ASBDJ}"
# Public origin, for the deep link inside Slack notifications. Defaulted for
# the same reason as the mention: --set-env-vars replaces the whole set, so a
# forgotten value silently strips the link.
PUBLIC_BASE_URL="${PVPDASH_PUBLIC_BASE_URL:-https://pvp-aste.web.app}"
# The real default Storage bucket name — read it from the Firebase console
# (e.g. pvp-aste.appspot.com or pvp-aste.firebasestorage.app). REQUIRED for
# `server` so attachments resolve to the correct bucket rather than the
# hardcoded `${projectId}.appspot.com` default in firestore.ts. REQUIRED for `server`.
STORAGE_BUCKET="${PVPDASH_STORAGE_BUCKET:-}"
# min-instances: 0 = scale-to-zero (~€0 fixed cost; the tradeoff is a cold
# start on the first request after idle, and — once procedure_concorsuali is
# actually deployed (DATA_MODEL.md §17.3, not live yet as of this note) — a
# cold start's snapshot rebuild would read the *entire* ~24k-document
# collection for both scopes, which is real but small money even if it
# happened often (§0.06/100k reads over the free tier). Briefly switched to 1
# (2026-08) to test an always-warm instance (~€2-3/month fixed for the
# reserved memory) and reverted the same day at the operator's request — not
# worth a guaranteed monthly cost before the feature driving the read-volume
# concern is even in production, and real Firestore read volume checked via
# Cloud Monitoring turned out to be a few thousand/day on quiet days (well
# under the 50k free quota) outside of active-development spikes. Revisit
# once procedure_concorsuali is live and real usage data exists.
MIN_INSTANCES="${PVPDASH_MIN_INSTANCES:-0}"
# Mount the bootstrap-admin secret ONLY on the very first deploy of a fresh
# project (PVPDASH_WITH_BOOTSTRAP=1). After the production bootstrap the secret
# must stay unmounted (DEPLOYMENT.md §4) — a redeploy must not re-add it.
WITH_BOOTSTRAP="${PVPDASH_WITH_BOOTSTRAP:-0}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIREBASE_CONFIG="${REPO_ROOT}/firebase/firebase.json"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }

require_tools() {
  command -v gcloud >/dev/null || { echo "gcloud not found — install the Google Cloud SDK"; exit 1; }
  command -v firebase >/dev/null || { echo "firebase CLI not found — npm i -g firebase-tools"; exit 1; }
}

deploy_rules() {
  log "Deploying Firestore rules + indexes and Storage rules (deny-all) to ${PROJECT}"
  firebase deploy \
    --only firestore:rules,firestore:indexes,storage \
    --project "${PROJECT}" \
    --config "${FIREBASE_CONFIG}"
  echo "→ Verify now: a direct client-SDK read of 'listings' and a direct Storage object GET must BOTH be refused."
}

deploy_server() {
  [ -n "${RUNTIME_SA}" ] || { echo "Set PVPDASH_RUNTIME_SA to the runtime service account email"; exit 1; }
  [ -n "${STORAGE_BUCKET}" ] || { echo "Set PVPDASH_STORAGE_BUCKET to the real default bucket name"; exit 1; }
  log "Deploying Cloud Run service ${SERVICE} (${REGION}) — builds the root Dockerfile via Cloud Build"
  # --source builds the repo-root Dockerfile through Cloud Build (no local Docker).
  # --allow-unauthenticated: the app owns auth (session cookies); Hosting's
  #   /api/** rewrite forwards public traffic here. --max-instances 1 is the
  #   in-process snapshot cache's correctness setting (SPECIFICATIONS.md §8).
  local secrets="PVPDASH_SESSION_SECRET=PVPDASH_SESSION_SECRET:latest"
  secrets="${secrets},PVPDASH_SLACK_WEBHOOK_URL=PVPDASH_SLACK_WEBHOOK_URL:latest"
  if [ "${WITH_BOOTSTRAP}" = "1" ]; then
    secrets="${secrets},PVPDASH_BOOTSTRAP_ADMIN_PASSWORD=PVPDASH_BOOTSTRAP_ADMIN_PASSWORD:latest"
  fi
  gcloud run deploy "${SERVICE}" \
    --source "${REPO_ROOT}" \
    --project "${PROJECT}" \
    --region "${REGION}" \
    --service-account "${RUNTIME_SA}" \
    --max-instances 1 \
    --min-instances "${MIN_INSTANCES}" \
    --allow-unauthenticated \
    --set-env-vars "PVPDASH_ENV=production,PVPDASH_FIRESTORE_PROJECT_ID=${PROJECT},PVPDASH_STORAGE_BUCKET=${STORAGE_BUCKET},PVPDASH_SLACK_MENTION_ID=${SLACK_MENTION_ID},PVPDASH_PUBLIC_BASE_URL=${PUBLIC_BASE_URL}" \
    --set-secrets "${secrets}"
  echo "→ Verify now: curl \$(gcloud run services describe ${SERVICE} --region ${REGION} --project ${PROJECT} --format='value(status.url)')/readyz  → 200"
  echo "→ After the production bootstrap (first admin created + password changed), remove the bootstrap secret:"
  echo "    gcloud run services update ${SERVICE} --region ${REGION} --project ${PROJECT} \\"
  echo "      --remove-secrets PVPDASH_BOOTSTRAP_ADMIN_PASSWORD"
}

deploy_hosting() {
  log "Building the SPA and deploying Firebase Hosting to ${PROJECT}"
  pnpm --filter @pvp/web build
  # The Firebase CLI refuses a `public` dir outside the directory that holds
  # firebase.json, so stage the build inside firebase/ (gitignored).
  rm -rf "${REPO_ROOT}/firebase/hosting-dist"
  cp -R "${REPO_ROOT}/apps/web/dist" "${REPO_ROOT}/firebase/hosting-dist"
  firebase deploy \
    --only hosting \
    --project "${PROJECT}" \
    --config "${FIREBASE_CONFIG}"
}

require_tools
case "${1:-}" in
  rules)   deploy_rules ;;
  server)  deploy_server ;;
  hosting) deploy_hosting ;;
  all)     deploy_rules; deploy_server; deploy_hosting ;;
  *) echo "Usage: $0 {rules|server|hosting|all}"; exit 1 ;;
esac
