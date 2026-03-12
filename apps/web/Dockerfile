# =============================================================================
# Grant Web – Multi-stage Dockerfile
# =============================================================================
# Build context: monorepo root (run with -f apps/web/Dockerfile)
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://demo.grant.center \
#     --build-arg NEXT_PUBLIC_APP_URL=https://demo.grant.center \
#     -t grant-web .
#
# NEXT_PUBLIC_APP_VERSION defaults to package.json "version" (see next.config.ts).
# NEXT_PUBLIC_* must be set at build time (Next.js inlines them at build).
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 – base: Node 22 Alpine with pnpm
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2 – builder: install deps and build Next.js (standalone output)
# ---------------------------------------------------------------------------
FROM base AS builder

# Build-time args for Next.js (must be set when building the image)
ARG NEXT_PUBLIC_API_URL=https://demo.grant.center
ARG NEXT_PUBLIC_APP_URL=https://demo.grant.center
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# NEXT_PUBLIC_APP_VERSION: optional; when unset, next.config.ts uses package.json version
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

# Copy full repo ( .dockerignore excludes node_modules, .next, etc.)
COPY . .

RUN pnpm install --frozen-lockfile --ignore-scripts
# grant-web imports @grantjs/client/react; build the client so dist/ exists
RUN pnpm --filter @grantjs/client build
RUN pnpm --filter grant-web build

# ---------------------------------------------------------------------------
# Stage 3 – runner: non-root user, copy standalone only (see §2.0 security)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Healthcheck in compose uses wget; node:alpine does not include it
RUN apk add --no-cache wget

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Next.js standalone: in a monorepo, server.js is under apps/web/ inside standalone.
# Copy with --chown so files are not root-owned (see §2.0 Docker security).
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

USER nodejs

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
# Next.js standalone binds to this host; 0.0.0.0 so it accepts connections in Docker
ENV HOSTNAME=0.0.0.0

# Run from the directory that contains server.js (monorepo: apps/web)
WORKDIR /app/apps/web
CMD ["node", "server.js"]
