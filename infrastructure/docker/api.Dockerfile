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
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
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
COPY packages/@grantjs/client/package.json packages/@grantjs/client/package.json
COPY packages/@grantjs/server/package.json packages/@grantjs/server/package.json
COPY packages/@grantjs/cli/package.json packages/@grantjs/cli/package.json

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
COPY --from=deps /app/packages/@grantjs/schema/node_modules ./packages/@grantjs/schema/node_modules

# -- Workspace root (pnpm needs these for workspace resolution) --
COPY package.json pnpm-workspace.yaml tsconfig.json ./

# -- @grantjs/constants (source-only package) --
COPY packages/@grantjs/constants/package.json packages/@grantjs/constants/package.json
COPY packages/@grantjs/constants/src packages/@grantjs/constants/src

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
