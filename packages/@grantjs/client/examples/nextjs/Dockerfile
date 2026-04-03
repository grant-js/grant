# =============================================================================
# Grant SDK Example (Next.js) – Static export + Nginx (CSR)
# =============================================================================
# Build context: monorepo root. output: "export"; no Node runtime.
# Gateway forwards the full URI (/example/…) without stripping the prefix.
#
# Installs only example-nextjs-client and @grantjs/client (not the full monorepo).
#
#   docker build -f packages/@grantjs/client/examples/nextjs/Dockerfile -t example-nextjs .
# =============================================================================

FROM node:22-alpine AS base
RUN npm install -g pnpm@8.15.0
WORKDIR /app

FROM base AS builder

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./

COPY packages/@grantjs/client/package.json packages/@grantjs/client/package.json
COPY packages/@grantjs/schema/package.json packages/@grantjs/schema/package.json
COPY packages/@grantjs/client/examples/nextjs/package.json packages/@grantjs/client/examples/nextjs/package.json

COPY packages/@grantjs/client ./packages/@grantjs/client
COPY packages/@grantjs/schema ./packages/@grantjs/schema
COPY packages/@grantjs/client/examples/nextjs ./packages/@grantjs/client/examples/nextjs

RUN mkdir -p apps
RUN pnpm install --frozen-lockfile --ignore-scripts --filter example-nextjs-client...
RUN pnpm --filter @grantjs/client build
RUN pnpm --filter example-nextjs-client build

FROM nginx:alpine AS runner

RUN apk add --no-cache wget

COPY packages/@grantjs/client/examples/nextjs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/@grantjs/client/examples/nextjs/out/. /usr/share/nginx/html/example/

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
