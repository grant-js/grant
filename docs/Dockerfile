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
# The guide compiles the browser SDK from source (vite alias in docs/.vitepress/config.ts).
COPY packages/@grantjs/client/src ./packages/@grantjs/client/src
# The API Configuration panel shows Grant's English error strings for i18n keys the API returns.
COPY packages/@grantjs/i18n/locales/en/errors.json ./packages/@grantjs/i18n/locales/en/errors.json

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
RUN chmod +x /docker-entrypoint.sh && \
    sed -i 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf && \
    chown -R nginx:nginx /var/cache/nginx

USER nginx

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
