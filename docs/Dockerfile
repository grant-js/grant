# =============================================================================
# Grant Docs (VitePress) – Multi-stage Dockerfile
# =============================================================================
# Build context: monorepo root (run with -f docs/Dockerfile)
#
#   docker build -f docs/Dockerfile -t grant-docs .
#
# Serves static site at port 8080. Use same CD pattern as API/Web (see deploy-demo.yml).
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 – base: Node 22 Alpine with pnpm
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2 – builder: install deps and build VitePress static site
# ---------------------------------------------------------------------------
FROM base AS builder

# VitePress lastUpdated uses git; Alpine does not include it
RUN apk add --no-cache git

# Env-driven defaults for docs theme (API/App URLs); same env as rest of demo stack
ARG VITE_API_URL=http://localhost:4000
ARG VITE_APP_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_URL=${VITE_APP_URL}

COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter grant-docs build

# ---------------------------------------------------------------------------
# Stage 3 – runner: nginx on 8080, non-root, COPY --chown (see §2.0 security)
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Healthcheck in compose uses wget; nginx:alpine does not include it
RUN apk add --no-cache wget

# Listen on 8080 so we can run as non-root; overwrite default config
RUN sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf && \
    sed -i 's/listen\s*\[::\]:80;/listen [::]:8080;/' /etc/nginx/conf.d/default.conf
COPY docs/nginx-docs.conf /etc/nginx/conf.d/default.conf

# Static content owned by nginx (uid 101 in nginx:alpine)
COPY --from=builder --chown=nginx:nginx /app/docs/.vitepress/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
