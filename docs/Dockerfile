# =============================================================================
# Grant Docs (VitePress) – Multi-stage Dockerfile
# =============================================================================
# Build context: monorepo root. Base path /docs/; frontend uses relative paths.
# Gateway serves this app at /docs.
#
# Installs only grant-docs and its dependencies (not the full monorepo).
#
#   docker build -f docs/Dockerfile -t grant-docs .
# =============================================================================

FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

FROM base AS builder

RUN apk add --no-cache git

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY docs/package.json docs/package.json
COPY docs ./docs

RUN mkdir -p apps
RUN pnpm install --frozen-lockfile --ignore-scripts --filter grant-docs...
RUN pnpm --filter grant-docs build

FROM nginx:alpine AS runner

RUN apk add --no-cache wget

RUN sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf && \
    sed -i 's/listen\s*\[::\]:80;/listen [::]:8080;/' /etc/nginx/conf.d/default.conf
COPY docs/nginx-docs.conf /etc/nginx/conf.d/default.conf

COPY --from=builder --chown=nginx:nginx /app/docs/.vitepress/dist /usr/share/nginx/html

COPY docs/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
