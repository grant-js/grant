# =============================================================================
# Grant API – Multi-stage Dockerfile
# =============================================================================
# Build context: monorepo root (run with -f apps/api/Dockerfile)
#
#   docker build -f apps/api/Dockerfile -t grant-api .
#
# The same image is used for E2E tests (docker-compose.e2e.yml) and deployment.
#
# Builder compiles the grant-api workspace subgraph to JavaScript; the runner
# starts with plain Node (no tsx) to avoid idle CPU from runtime transpilation.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 – base: Node 22 Alpine with pnpm
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2 – builder: install, compile workspace + API, production prune
# ---------------------------------------------------------------------------
FROM base AS builder

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY scripts/docker scripts/docker

COPY apps/api/package.json apps/api/package.json
COPY packages/@grantjs/database/package.json packages/@grantjs/database/package.json
COPY packages/@grantjs/env/package.json packages/@grantjs/env/package.json
COPY packages/@grantjs/schema/package.json packages/@grantjs/schema/package.json
COPY packages/@grantjs/core/package.json packages/@grantjs/core/package.json
COPY packages/@grantjs/webhooks/package.json packages/@grantjs/webhooks/package.json
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

RUN pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist --filter grant-api...

COPY packages/@grantjs/tsconfig.build.json packages/@grantjs/tsconfig.build.json
COPY packages/@grantjs/constants packages/@grantjs/constants
COPY packages/@grantjs/i18n packages/@grantjs/i18n
COPY packages/@grantjs/database packages/@grantjs/database
COPY packages/@grantjs/env packages/@grantjs/env
COPY packages/@grantjs/core packages/@grantjs/core
COPY packages/@grantjs/webhooks packages/@grantjs/webhooks
COPY packages/@grantjs/schema packages/@grantjs/schema
COPY packages/@grantjs/logger packages/@grantjs/logger
COPY packages/@grantjs/errors packages/@grantjs/errors
COPY packages/@grantjs/cache packages/@grantjs/cache
COPY packages/@grantjs/storage packages/@grantjs/storage
COPY packages/@grantjs/email packages/@grantjs/email
COPY packages/@grantjs/jobs packages/@grantjs/jobs
COPY packages/@grantjs/analytics packages/@grantjs/analytics
COPY packages/@grantjs/telemetry packages/@grantjs/telemetry
COPY apps/api apps/api

RUN node scripts/docker/build-api-production.mjs

RUN echo -e 'ignore-scripts=true\nshamefully-hoist=true' >> .npmrc && CI=true pnpm prune --prod && rm -f .npmrc

# ---------------------------------------------------------------------------
# Stage 3 – runner: pruned node_modules + compiled output
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache su-exec && \
    addgroup --system --gid 1001 grantjs && \
    adduser --system --uid 1001 grantjs

WORKDIR /app

COPY --from=builder --chown=grantjs:grantjs /app ./

COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    mkdir -p /app/apps/api/storage && \
    chown -R grantjs:grantjs /app/apps/api/storage

EXPOSE 4000

ENV NODE_ENV=production
ENV API_PORT=4000

WORKDIR /app/apps/api

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
