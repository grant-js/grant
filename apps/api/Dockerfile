# =============================================================================
# Grant API – Multi-stage Dockerfile
# =============================================================================
# Build context: monorepo root (run with -f apps/api/Dockerfile)
#
#   docker build -f apps/api/Dockerfile -t grant-api .
#
# The same image is used for E2E tests (docker-compose.e2e.yml) and deployment.
#
# Installs only the grant-api workspace subgraph, then pnpm prune --prod so root
# devDependencies (VitePress, ESLint, Turbo, …) are not shipped. Workspace
# packages expose TypeScript sources; tsx (runtime dependency) executes them.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 – base: Node 22 Alpine with pnpm
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2 – deps: filtered install + production prune
# ---------------------------------------------------------------------------
FROM base AS deps

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/@grantjs/database/package.json packages/@grantjs/database/package.json
COPY packages/@grantjs/env/package.json packages/@grantjs/env/package.json
COPY packages/@grantjs/schema/package.json packages/@grantjs/schema/package.json
COPY packages/@grantjs/core/package.json packages/@grantjs/core/package.json
COPY packages/@grantjs/constants/package.json packages/@grantjs/constants/package.json
COPY packages/@grantjs/i18n/package.json packages/@grantjs/i18n/package.json
COPY packages/@grantjs/logger/package.json packages/@grantjs/logger/package.json
COPY packages/@grantjs/errors/package.json packages/@grantjs/errors/package.json
COPY packages/@grantjs/cache/package.json packages/@grantjs/cache/package.json
COPY packages/@grantjs/storage/package.json packages/@grantjs/storage/package.json
COPY packages/@grantjs/email/package.json packages/@grantjs/email/package.json
COPY packages/@grantjs/jobs/package.json packages/@grantjs/jobs/package.json
COPY packages/@grantjs/analytics/package.json packages/@grantjs/analytics/package.json
COPY packages/@grantjs/telemetry/package.json packages/@grantjs/telemetry/package.json

# Skip lifecycle scripts (postinstall runs scripts/env/setup.mjs for local .env).
# Use shamefully-hoist so peer dependencies (ioredis, node-cron) are accessible across workspace packages.
RUN pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist --filter grant-api...
# prune reinstalls; root postinstall expects scripts/env (not copied) — keep scripts off.
RUN echo -e 'ignore-scripts=true\nshamefully-hoist=true' >> .npmrc && CI=true pnpm prune --prod && rm -f .npmrc

# ---------------------------------------------------------------------------
# Stage 3 – runner: copy pruned node_modules + sources
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN addgroup --system --gid 1001 grantjs && \
    adduser --system --uid 1001 grantjs

WORKDIR /app

# Full install tree from deps (pnpm may omit empty per-package node_modules after prune).
COPY --from=deps --chown=grantjs:grantjs /app ./
COPY --chown=grantjs:grantjs tsconfig.json ./

COPY --chown=grantjs:grantjs packages/@grantjs/constants/package.json packages/@grantjs/constants/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/constants/src packages/@grantjs/constants/src

COPY --chown=grantjs:grantjs packages/@grantjs/i18n/package.json packages/@grantjs/i18n/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/i18n/tsconfig.json packages/@grantjs/i18n/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/i18n/src packages/@grantjs/i18n/src
COPY --chown=grantjs:grantjs packages/@grantjs/i18n/locales packages/@grantjs/i18n/locales

COPY --chown=grantjs:grantjs packages/@grantjs/database/package.json packages/@grantjs/database/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/database/tsconfig.json packages/@grantjs/database/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/database/drizzle.config.ts packages/@grantjs/database/drizzle.config.cjs packages/@grantjs/database/
COPY --chown=grantjs:grantjs packages/@grantjs/database/src packages/@grantjs/database/src

COPY --chown=grantjs:grantjs packages/@grantjs/env/package.json packages/@grantjs/env/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/env/tsconfig.json packages/@grantjs/env/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/env/src packages/@grantjs/env/src

COPY --chown=grantjs:grantjs packages/@grantjs/core/package.json packages/@grantjs/core/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/core/tsconfig.json packages/@grantjs/core/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/core/src packages/@grantjs/core/src

COPY --chown=grantjs:grantjs packages/@grantjs/schema/package.json packages/@grantjs/schema/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/schema/src packages/@grantjs/schema/src

COPY --chown=grantjs:grantjs packages/@grantjs/logger/package.json packages/@grantjs/logger/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/logger/tsconfig.json packages/@grantjs/logger/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/logger/src packages/@grantjs/logger/src

COPY --chown=grantjs:grantjs packages/@grantjs/errors/package.json packages/@grantjs/errors/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/errors/tsconfig.json packages/@grantjs/errors/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/errors/src packages/@grantjs/errors/src

COPY --chown=grantjs:grantjs packages/@grantjs/cache/package.json packages/@grantjs/cache/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/cache/tsconfig.json packages/@grantjs/cache/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/cache/src packages/@grantjs/cache/src

COPY --chown=grantjs:grantjs packages/@grantjs/storage/package.json packages/@grantjs/storage/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/storage/tsconfig.json packages/@grantjs/storage/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/storage/src packages/@grantjs/storage/src

COPY --chown=grantjs:grantjs packages/@grantjs/email/package.json packages/@grantjs/email/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/email/tsconfig.json packages/@grantjs/email/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/email/src packages/@grantjs/email/src

COPY --chown=grantjs:grantjs packages/@grantjs/jobs/package.json packages/@grantjs/jobs/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/jobs/tsconfig.json packages/@grantjs/jobs/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/jobs/src packages/@grantjs/jobs/src

COPY --chown=grantjs:grantjs packages/@grantjs/analytics/package.json packages/@grantjs/analytics/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/analytics/tsconfig.json packages/@grantjs/analytics/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/analytics/src packages/@grantjs/analytics/src

COPY --chown=grantjs:grantjs packages/@grantjs/telemetry/package.json packages/@grantjs/telemetry/package.json
COPY --chown=grantjs:grantjs packages/@grantjs/telemetry/tsconfig.json packages/@grantjs/telemetry/tsconfig.json
COPY --chown=grantjs:grantjs packages/@grantjs/telemetry/src packages/@grantjs/telemetry/src

COPY --chown=grantjs:grantjs apps/api/package.json apps/api/package.json
COPY --chown=grantjs:grantjs apps/api/tsconfig.json apps/api/tsconfig.json
COPY --chown=grantjs:grantjs apps/api/src apps/api/src

RUN mkdir -p /app/apps/api/storage && chown -R grantjs:grantjs /app/apps/api/storage

USER grantjs

EXPOSE 4000

ENV NODE_ENV=production
ENV API_PORT=4000

WORKDIR /app/apps/api

CMD ["node_modules/.bin/tsx", "src/server.ts"]
