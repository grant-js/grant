# =============================================================================
# Grant SDK Example (Next.js) – Docker via "next start" (no standalone)
# =============================================================================
# Build context: monorepo root. This app does not use output: "standalone" because
# Next does not emit server.js for this nested package; we run "next start" with
# full .next + node_modules instead (official Node.js server deployment).
#
#   docker build -f packages/@grantjs/client/examples/nextjs/Dockerfile \
#     --build-arg NEXT_PUBLIC_GRANT_API_URL=http://localhost:4000 \
#     --build-arg NEXT_PUBLIC_GRANT_FRONTEND_URL=http://localhost:3000 \
#     -t example-nextjs .
# =============================================================================

FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

FROM base AS builder

ARG NEXT_PUBLIC_GRANT_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_GRANT_FRONTEND_URL=http://localhost:3000
ARG NEXT_PUBLIC_EXAMPLE_APP_ORIGIN=http://localhost:3004
ENV NEXT_PUBLIC_GRANT_API_URL=$NEXT_PUBLIC_GRANT_API_URL
ENV NEXT_PUBLIC_GRANT_FRONTEND_URL=$NEXT_PUBLIC_GRANT_FRONTEND_URL
ENV NEXT_PUBLIC_EXAMPLE_APP_ORIGIN=$NEXT_PUBLIC_EXAMPLE_APP_ORIGIN

COPY . .

RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @grantjs/client build
RUN pnpm --filter example-nextjs-client build

# ---------------------------------------------------------------------------
# Runner: full .next + node_modules, run "next start"
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache wget

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Built output and config
COPY --from=builder --chown=nodejs:nodejs /app/packages/@grantjs/client/examples/nextjs/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/packages/@grantjs/client/examples/nextjs/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/@grantjs/client/examples/nextjs/next.config.mjs ./next.config.mjs
# Full root node_modules (pnpm: .pnpm store + workspace symlinks; "next" may only be in .pnpm)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
# pnpm does not hoist "next" to root; ensure node_modules/next exists for "next start"
RUN cd /app/node_modules && \
    NEXT_PKG="$(ls -d .pnpm/next@15* 2>/dev/null | head -1)" && \
    [ -n "$NEXT_PKG" ] && ln -sf "$NEXT_PKG/node_modules/next" next || (echo "FATAL: next not found in .pnpm" && exit 1)

USER nodejs

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_PATH=/app/node_modules

# Run Next CLI via node (avoids npx and broken .bin symlinks from copied pnpm layout)
CMD ["node", "node_modules/next/dist/bin/next", "start"]
