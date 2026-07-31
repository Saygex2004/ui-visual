# Production container for the Fastify API (Execution Plan Phase 12,
# DEPLOYMENT.md §4). Multi-stage: a build stage that installs the whole pnpm
# workspace and bundles the server (esbuild → a single self-contained
# dist/index.js, see apps/server/build.mjs), and a slim non-root runtime stage
# that carries only the bundle plus the server's production node_modules.
#
# Located at the repo root (not deploy/) so `gcloud run deploy --source .`
# builds it via Cloud Build with zero extra config and no local Docker — the
# deploy script (deploy/deploy.sh) relies on this.
#
# Cloud Run injects $PORT (config.ts honours PORT over PVPDASH_PORT) and the
# runtime service account provides Application Default Credentials — no
# GOOGLE_APPLICATION_CREDENTIALS, no secrets baked into the image (they arrive
# as env vars from Secret Manager at deploy time).

# ---- Build stage --------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# Toolchain for argon2's native addon (belt-and-suspenders — prebuilt binaries
# usually cover linux-x64, but a source build must not fail the image).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Whole workspace (the .dockerignore trims node_modules, build output, git,
# emulator data and test artifacts) — pnpm needs every member's manifest and
# the lockfile to install deterministically.
COPY . .

RUN pnpm install --frozen-lockfile

# esbuild bundle → apps/server/dist/index.js
RUN pnpm --filter @pvp/server build

# Production node_modules for the server's external (non-bundled) deps —
# argon2 (native), firebase-admin, fastify, @fastify/*, zod. pnpm copies real
# folders (not workspace symlinks) into /prod, with argon2's linux binary.
# --legacy: required since pnpm v10 for workspaces without
# inject-workspace-packages (ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE).
RUN pnpm --filter=@pvp/server --prod deploy --legacy /prod

# ---- Runtime stage ------------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# node:22-slim ships a non-root `node` user; own the app dir so it can read it.
COPY --from=builder --chown=node:node /prod/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/server/dist ./dist

USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
