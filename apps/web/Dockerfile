# =============================================================================
# Grant Web – Multi-stage Dockerfile
# =============================================================================
# Build context: monorepo root (run with -f apps/web/Dockerfile)
#
# No build-time URL args: the app loads config at runtime from GET /api/config
# (reads process.env.APP_URL, APP_URL_API, etc. set by compose env_file).
#
# Installs only grant-web and its workspace subgraph (not the full monorepo).
#
#   docker build -f apps/web/Dockerfile -t grant-web .
# =============================================================================

FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

FROM base AS builder

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./

COPY apps/web/package.json apps/web/package.json
COPY packages/@grantjs/client/package.json packages/@grantjs/client/package.json
COPY packages/@grantjs/constants/package.json packages/@grantjs/constants/package.json
COPY packages/@grantjs/core/package.json packages/@grantjs/core/package.json
COPY packages/@grantjs/i18n/package.json packages/@grantjs/i18n/package.json
COPY packages/@grantjs/schema/package.json packages/@grantjs/schema/package.json

COPY apps/web ./apps/web
COPY packages/@grantjs/client ./packages/@grantjs/client
COPY packages/@grantjs/constants ./packages/@grantjs/constants
COPY packages/@grantjs/core ./packages/@grantjs/core
COPY packages/@grantjs/i18n ./packages/@grantjs/i18n
COPY packages/@grantjs/schema ./packages/@grantjs/schema

RUN pnpm install --frozen-lockfile --ignore-scripts --filter grant-web...
RUN pnpm --filter @grantjs/client build
RUN pnpm --filter grant-web build

FROM node:22-alpine AS runner

RUN apk add --no-cache wget

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

USER nodejs

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/web
CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# Stage: runner-lambda — the same standalone server, fronted by the adapter
# ---------------------------------------------------------------------------
# Mirrors `apps/api/Dockerfile`, and for the same reason: the Lambda Web Adapter is an
# extension that translates each invocation into an HTTP request against a normal
# listening server, so `apps/web` needs no knowledge of Lambda and CMD is unchanged.
#
# OpenNext was the plan and is deliberately not used. It exists to solve ISR cache
# persistence and image optimization on serverless, and this app uses neither — no
# `revalidate`, no `revalidatePath`/`revalidateTag`, no `generateStaticParams`, and no
# `next/image` imports. Adding it would mean a second build toolchain and a dependency
# on Next 16 support that is active but not formally verified, to buy features nothing
# here consumes. Recorded in the stack plan; revisit if ISR is ever adopted.
FROM runner AS runner-lambda

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter

# Must match PORT from `runner` above.
ENV AWS_LWA_PORT=3000

# TCP rather than an HTTP path, as in the API image: the Next standalone server binds
# the port only once it is ready to serve, so the bind is the readiness signal and no
# route needs to answer before the adapter will forward traffic.
ENV AWS_LWA_READINESS_CHECK_PROTOCOL=tcp
