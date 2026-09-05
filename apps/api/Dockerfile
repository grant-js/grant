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
COPY packages/@grantjs/secrets/package.json packages/@grantjs/secrets/package.json

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
COPY packages/@grantjs/secrets packages/@grantjs/secrets
COPY apps/api apps/api

RUN node scripts/docker/build-api-production.mjs

# ---------------------------------------------------------------------------
# Stage 2b – bundler: single-file ESM build of the API server (Lambda only)
# ---------------------------------------------------------------------------
# Branches off `builder` rather than extending it, for two reasons:
#   - esbuild is a root devDependency, so this must run BEFORE the prune below.
#   - Docker only builds the stages a target depends on. `runner` and `default` do
#     not reference this one, so the Kubernetes and Compose images never run esbuild
#     and never carry its output.
FROM builder AS bundler

RUN node scripts/docker/bundle-api-lambda.mjs

# ---------------------------------------------------------------------------
# Stage 2c – pruner: drop devDependencies
# ---------------------------------------------------------------------------
# This was the last step of `builder`. It moved into its own stage so `bundler`
# above can branch off the tree while devDependencies are still installed; the /app
# it produces is what `builder` used to hand to `runner`.
FROM builder AS pruner

RUN echo -e 'ignore-scripts=true\nshamefully-hoist=true' >> .npmrc && CI=true pnpm prune --prod && rm -f .npmrc

# ---------------------------------------------------------------------------
# Stage 3 – runner: pruned node_modules + compiled output
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache su-exec && \
    addgroup --system --gid 1001 grantjs && \
    adduser --system --uid 1001 grantjs

WORKDIR /app

COPY --from=pruner --chown=grantjs:grantjs /app ./

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

# ---------------------------------------------------------------------------
# Stage 4 – runner-lambda: the runner above, plus the Lambda Web Adapter
# ---------------------------------------------------------------------------
# Built only for the AWS deployment target (`--target runner-lambda`). The
# default build still stops at `runner`, so nothing about the Kubernetes or
# Compose image changes.
#
# This stage extends `runner` rather than rebuilding from `node:22-alpine` on
# purpose. Two consequences, both wanted:
#   - The Lambda image is byte-identical to the K8s image plus one binary, so
#     "works in staging, breaks on Lambda" cannot come from image drift.
#   - It inherits the whole builder `/app`, which includes `pnpm-workspace.yaml`.
#     `findWorkspaceRoot()` (@grantjs/env) walks up from the working directory
#     for that file and throws `Error('Workspace root not found')` on first
#     import if it is missing — before any application code runs, with no useful
#     trace. A slimmed stage that copied only `dist` + `node_modules` would fail
#     at cold start for that reason.
#
# The adapter is a Lambda *extension*: the runtime starts it from
# /opt/extensions, it registers with the Runtime API, and it forwards each
# invocation to the app over loopback as an ordinary HTTP request. The app stays
# a normal listening server and knows nothing about Lambda — so CMD is unchanged.
FROM runner AS runner-lambda

# Repository is `aws-lambda-adapter` (no `web`), despite the project being named
# the Lambda Web Adapter. Verified against the ECR API, not recalled.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter

# The adapter probes the app on this port; it must match API_PORT from `runner`.
ENV AWS_LWA_PORT=4000

# TCP, not an HTTP probe against /health, and the difference is a security one.
#
# An HTTP readiness path has to answer before the adapter will forward anything, so
# it must be exempt from origin verification — and the Function URL is publicly
# reachable, which made /health an unauthenticated endpoint on a public origin.
#
# TCP needs no exemption and loses nothing: `server.ts` calls `httpServer.listen()`
# only after `createApp()` has resolved, so the port does not open until Apollo, the
# database connection and every middleware are in place. Binding the port is already
# the readiness signal the HTTP probe was standing in for.
ENV AWS_LWA_READINESS_CHECK_PROTOCOL=tcp

# The single-file bundle from stage `bundler`. Lambda starts a fresh process on every
# cold start, so module *resolution* — walking node_modules and linking ~2,000 files —
# is paid per cold start rather than once per pod. Collapsing it into one file cut the
# measured import phase from ~2,470 ms to ~1,090 ms.
#
# `dist/` is still here and still what `runner` runs. This adds a second entrypoint
# beside it; it does not replace one. `dist/migrate.js` in particular is unchanged and
# is still what the deploy-time migration task runs, where cold start does not matter.
COPY --from=bundler --chown=grantjs:grantjs /app/apps/api/dist-lambda /app/apps/api/dist-lambda

# Two directories the bundle can no longer find on its own. Both are normally derived
# from `import.meta.url` by the module that owns them, which esbuild rewrites to the
# bundle's own path — so they are passed explicitly instead. Empty (the default
# everywhere else) keeps the original relative resolution, so `runner` is unaffected.
ENV I18N_LOCALES_DIR=/app/packages/@grantjs/i18n/locales
ENV DB_MIGRATIONS_DIR=/app/packages/@grantjs/database/dist/migrations

CMD ["node", "dist-lambda/server.mjs"]

# ---------------------------------------------------------------------------
# Stage 5 – default: keep `runner` the implicit build target
# ---------------------------------------------------------------------------
# Docker builds the LAST stage when `--target` is omitted, and every consumer
# omits it: docker-compose.yml, docker-compose.e2e.yml, docker-compose.demo.yml
# and release.yml (which passes only `file`). Without this stage, appending
# runner-lambda above would silently redefine what `docker build` produces and
# publish the Lambda image to GHCR as `grant-api`.
#
# Anything added below this line changes the default target again. Add new
# stages ABOVE it.
FROM runner AS default
