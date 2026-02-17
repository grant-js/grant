# =============================================================================
# Grant API – Multi-stage Dockerfile
# =============================================================================
# Build context: monorepo root (run with -f infrastructure/docker/api.Dockerfile)
#
#   docker build -f infrastructure/docker/api.Dockerfile -t grant-api .
#
# The same image is used for E2E tests (docker-compose.e2e.yml) and deployment.
#
# NOTE: Workspace packages expose "main": "src/index.ts" (raw TypeScript).
# The runtime uses `tsx` to handle TS imports, path aliases, and ESM.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 – base: Node 22 Alpine with pnpm
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2 – deps: install ALL dependencies (tsx is a devDependency)
# ---------------------------------------------------------------------------
FROM base AS deps

# Copy workspace config and every package.json so pnpm resolves correctly
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/@grantjs/database/package.json packages/@grantjs/database/package.json
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
COPY packages/@grantjs/client/package.json packages/@grantjs/client/package.json
COPY packages/@grantjs/server/package.json packages/@grantjs/server/package.json
COPY packages/@grantjs/cli/package.json packages/@grantjs/cli/package.json

# Copy i18n package source and locales so pnpm can resolve the workspace package
COPY packages/@grantjs/i18n/tsconfig.json packages/@grantjs/i18n/tsconfig.json
COPY packages/@grantjs/i18n/src packages/@grantjs/i18n/src
COPY packages/@grantjs/i18n/locales packages/@grantjs/i18n/locales

# Install ALL deps (need tsx + typescript in runtime for TS workspace packages)
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 3 – runner: copy source and run with tsx
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN addgroup --system --gid 1001 grantjs && \
    adduser --system --uid 1001 grantjs

WORKDIR /app

# -- node_modules from deps stage --
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/@grantjs/database/node_modules ./packages/@grantjs/database/node_modules
COPY --from=deps /app/packages/@grantjs/core/node_modules ./packages/@grantjs/core/node_modules
COPY --from=deps /app/packages/@grantjs/constants/node_modules ./packages/@grantjs/constants/node_modules
COPY --from=deps /app/packages/@grantjs/i18n/node_modules ./packages/@grantjs/i18n/node_modules
COPY --from=deps /app/packages/@grantjs/schema/node_modules ./packages/@grantjs/schema/node_modules
COPY --from=deps /app/packages/@grantjs/logger/node_modules ./packages/@grantjs/logger/node_modules
COPY --from=deps /app/packages/@grantjs/errors/node_modules ./packages/@grantjs/errors/node_modules
COPY --from=deps /app/packages/@grantjs/cache/node_modules ./packages/@grantjs/cache/node_modules
COPY --from=deps /app/packages/@grantjs/storage/node_modules ./packages/@grantjs/storage/node_modules
COPY --from=deps /app/packages/@grantjs/email/node_modules ./packages/@grantjs/email/node_modules
COPY --from=deps /app/packages/@grantjs/jobs/node_modules ./packages/@grantjs/jobs/node_modules
COPY --from=deps /app/packages/@grantjs/analytics/node_modules ./packages/@grantjs/analytics/node_modules
COPY --from=deps /app/packages/@grantjs/telemetry/node_modules ./packages/@grantjs/telemetry/node_modules

# -- Workspace root (pnpm needs these for workspace resolution) --
COPY package.json pnpm-workspace.yaml tsconfig.json ./

# -- @grantjs/constants (source-only package) --
COPY packages/@grantjs/constants/package.json packages/@grantjs/constants/package.json
COPY packages/@grantjs/constants/src packages/@grantjs/constants/src

# -- @grantjs/i18n (locale constants + translation data) --
COPY packages/@grantjs/i18n/package.json packages/@grantjs/i18n/package.json
COPY packages/@grantjs/i18n/tsconfig.json packages/@grantjs/i18n/tsconfig.json
COPY packages/@grantjs/i18n/src packages/@grantjs/i18n/src
COPY packages/@grantjs/i18n/locales packages/@grantjs/i18n/locales

# -- @grantjs/database (source-only; schemas + connection) --
COPY packages/@grantjs/database/package.json packages/@grantjs/database/package.json
COPY packages/@grantjs/database/src packages/@grantjs/database/src

# -- @grantjs/core (source-only; RBAC engine) --
COPY packages/@grantjs/core/package.json packages/@grantjs/core/package.json
COPY packages/@grantjs/core/tsconfig.json packages/@grantjs/core/tsconfig.json
COPY packages/@grantjs/core/src packages/@grantjs/core/src

# -- @grantjs/schema (source-only; .graphql files + generated TS types) --
COPY packages/@grantjs/schema/package.json packages/@grantjs/schema/package.json
COPY packages/@grantjs/schema/src packages/@grantjs/schema/src

# -- @grantjs/logger (Pino adapter for ILogger port) --
COPY packages/@grantjs/logger/package.json packages/@grantjs/logger/package.json
COPY packages/@grantjs/logger/tsconfig.json packages/@grantjs/logger/tsconfig.json
COPY packages/@grantjs/logger/src packages/@grantjs/logger/src

# -- @grantjs/errors (HttpException hierarchy + domain-to-HTTP mapper) --
COPY packages/@grantjs/errors/package.json packages/@grantjs/errors/package.json
COPY packages/@grantjs/errors/tsconfig.json packages/@grantjs/errors/tsconfig.json
COPY packages/@grantjs/errors/src packages/@grantjs/errors/src

# -- @grantjs/cache (cache adapter: memory / Redis) --
COPY packages/@grantjs/cache/package.json packages/@grantjs/cache/package.json
COPY packages/@grantjs/cache/tsconfig.json packages/@grantjs/cache/tsconfig.json
COPY packages/@grantjs/cache/src packages/@grantjs/cache/src

# -- @grantjs/storage (storage adapter: local / S3) --
COPY packages/@grantjs/storage/package.json packages/@grantjs/storage/package.json
COPY packages/@grantjs/storage/tsconfig.json packages/@grantjs/storage/tsconfig.json
COPY packages/@grantjs/storage/src packages/@grantjs/storage/src

# -- @grantjs/email (email adapter: SMTP / SES) --
COPY packages/@grantjs/email/package.json packages/@grantjs/email/package.json
COPY packages/@grantjs/email/tsconfig.json packages/@grantjs/email/tsconfig.json
COPY packages/@grantjs/email/src packages/@grantjs/email/src

# -- @grantjs/jobs (background job scheduler) --
COPY packages/@grantjs/jobs/package.json packages/@grantjs/jobs/package.json
COPY packages/@grantjs/jobs/tsconfig.json packages/@grantjs/jobs/tsconfig.json
COPY packages/@grantjs/jobs/src packages/@grantjs/jobs/src

# -- @grantjs/analytics (analytics adapters: noop, Umami) --
COPY packages/@grantjs/analytics/package.json packages/@grantjs/analytics/package.json
COPY packages/@grantjs/analytics/tsconfig.json packages/@grantjs/analytics/tsconfig.json
COPY packages/@grantjs/analytics/src packages/@grantjs/analytics/src

# -- @grantjs/telemetry (log shipping: noop, CloudWatch) --
COPY packages/@grantjs/telemetry/package.json packages/@grantjs/telemetry/package.json
COPY packages/@grantjs/telemetry/tsconfig.json packages/@grantjs/telemetry/tsconfig.json
COPY packages/@grantjs/telemetry/src packages/@grantjs/telemetry/src

# -- API app (source + tsconfig for path alias resolution) --
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src

# Create storage directory for local file adapter (writable by grantjs user)
RUN mkdir -p /app/apps/api/storage && chown -R grantjs:grantjs /app/apps/api/storage

USER grantjs

EXPOSE 4000

ENV NODE_ENV=production
ENV APP_PORT=4000

# Set workdir to apps/api so tsx resolves tsconfig.json (and its path aliases) correctly
WORKDIR /app/apps/api

# Run with tsx – handles TypeScript imports, path aliases (@/*), and ESM
CMD ["node_modules/.bin/tsx", "src/server.ts"]
