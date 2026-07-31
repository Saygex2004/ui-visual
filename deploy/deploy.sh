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
# The real default Storage bucket name — read it from the Firebase console
# (e.g. pvp-aste.appspot.com or pvp-aste.firebasestorage.app). REQUIRED for
# `server` so attachments resolve to the correct bucket rather than the
# hardcoded `${projectId}.appspot.com` default in firestore.ts. REQUIRED for `server`.
STORAGE_BUCKET="${PVPDASH_STORAGE_BUCKET:-}"
# min-instances: 0 = scale-to-zero (operator's choice for go-live; a cold start
# of a few seconds, ~€0). Bump to 1 later for an always-warm instance.
MIN_INSTANCES="${PVPDASH_MIN_INSTANCES:-0}"

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
  gcloud run deploy "${SERVICE}" \
    --source "${REPO_ROOT}" \
    --project "${PROJECT}" \
    --region "${REGION}" \
    --service-account "${RUNTIME_SA}" \
    --max-instances 1 \
    --min-instances "${MIN_INSTANCES}" \
    --allow-unauthenticated \
    --set-env-vars "PVPDASH_ENV=production,PVPDASH_FIRESTORE_PROJECT_ID=${PROJECT},PVPDASH_STORAGE_BUCKET=${STORAGE_BUCKET}" \
    --set-secrets "PVPDASH_SESSION_SECRET=PVPDASH_SESSION_SECRET:latest,PVPDASH_BOOTSTRAP_ADMIN_PASSWORD=PVPDASH_BOOTSTRAP_ADMIN_PASSWORD:latest"
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
