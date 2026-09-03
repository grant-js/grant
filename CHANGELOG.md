# Changelog

All notable platform releases (apps, Docker images, and publishable npm packages) are documented here.
Package-specific histories also live under `packages/@grantjs/*/CHANGELOG.md`.

## 1.6.1

### Platform

**Docker images:** tagged `:1.6.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.6.1** (fixed group with apps).

### Patch Changes

- 9eecf80: De-duplicate Redis SCAN results in `RedisCacheAdapter`. SCAN guarantees each key is returned at least once, not exactly once, so `keys()` could report a key twice and `clear()` could issue a redundant DEL when the keyspace is resized mid-iteration.

  The fix is in `@grantjs/cache`, which is internal and never published, so the changeset names the app that ships it. A changeset naming only ignored packages versions nothing, which keeps changesets/action on the version-PR path and stops publish from ever running.

## 1.6.0

### Platform

**Docker images:** tagged `:1.6.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.6.0** (fixed group with apps).

### Minor Changes

- 7a96814: Add an `emf` telemetry provider that writes CloudWatch Embedded Metric Format documents to stdout.

  Selected with `TELEMETRY_PROVIDER=emf`; `none` remains the default and the `cloudwatch` provider is unchanged. EMF suits a frozen-container runtime where the existing CloudWatch adapter does not: it needs no SDK, no log-stream sequence token, and nothing flushed before a freeze.

  `TELEMETRY_EMF_DIMENSIONS` defaults to `method,statusCode` and deliberately excludes `path` — request paths embed resource IDs, and every distinct dimension combination creates a billable CloudWatch metric. Unbounded fields are still emitted as document properties and stay queryable in Logs Insights.

  `/metrics`, the Prometheus middleware, and the ServiceMonitor are untouched; the two paths coexist and are config-selected.

- 7a96814: Add a `runner-lambda` Docker build target that layers the AWS Lambda Web Adapter onto the existing runner image.

  Built only with `--target runner-lambda`; the default build is unchanged and still produces the Kubernetes/Compose image. The Lambda image is the existing runner plus one binary, so the two cannot drift apart.

- 7a96814: Resolve deployment secrets through a new `ISecretResolver` port instead of reading them from configuration at module scope.

  `SECRETS_PROVIDER` defaults to `env`, which reads `process.env` exactly as before — existing deployments are unaffected. Setting it to `aws-secrets-manager` resolves secrets from a single JSON secret per use, falling back to the environment for any key the payload omits, so secrets can move over one at a time.

  Because resolution is now per-use rather than once at process start, a rotated secret is picked up within `SECRETS_CACHE_TTL_SECONDS` without a redeploy.

  `IGitHubOAuthService.isConfigured()` now returns `Promise<boolean>`, since determining whether GitHub OAuth is configured requires resolving the client secret.

### Patch Changes

- 7a96814: Add `DB_BOOTSTRAP_ON_BOOT` and a standalone migrate entrypoint.

  Migrations and the core seed still run at API start by default, so no existing
  deployment changes behavior. Setting `DB_BOOTSTRAP_ON_BOOT=false` skips them, for
  deployments that run migrations as a separate step — a Helm hook Job, an ECS one-off
  task, or any serverless target where concurrent cold starts must not each attempt to
  migrate.

  `node dist/migrate.js` is that separate step. It runs the same idempotent,
  advisory-locked bootstrap and exits 0 or 1. It exists because
  `pnpm --filter @grantjs/database db:migrate` cannot run inside the production image:
  that script invokes `drizzle-kit`, a devDependency the runner stage prunes away.

  Setting the flag to `false` without running the migrate step will start the API
  against an unmigrated database.

- 7a96814: Add `TRACING_SPAN_PROCESSOR` to select how OpenTelemetry spans are exported.

  `batch` (default) buffers spans and exports them on a timer, which is unchanged
  behavior for the long-running server. `simple` exports each span as it ends.

  Use `simple` on any runtime that can freeze or terminate the process between
  requests — AWS Lambda behind the Web Adapter, for instance — where a buffered batch
  is not delayed but lost, and the spans lost are disproportionately those of the
  slowest requests.

  Only applies when `TRACING_ENABLED=true`.

## 1.5.5

### Platform

**Docker images:** tagged `:1.5.5` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.5** (fixed group with apps).

### Patch Changes

- 9c1aaeb: Fix graceful shutdown aborting before it released any resources.

  `ApolloServerPluginDrainHttpServer` closes the HTTP server during
  `apolloServer.stop()`, so the subsequent `httpServer.close()` reported
  `ERR_SERVER_NOT_RUNNING`. That rejection escaped the shutdown sequence, which meant
  every step after it was skipped: OpenTelemetry spans were never flushed, job
  schedules were never stopped, and the cache and database connections were never
  closed. The process exited 1 on every SIGTERM, so each Kubernetes pod termination
  was a hard failure.

  Closing an already-closed server is now treated as success, since it is the outcome
  the caller wanted. Shutdown runs to completion and exits 0.

## 1.5.4

### Platform

**Docker images:** tagged `:1.5.4` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.4** (fixed group with apps).

### Patch Changes

- 9caf929: Fix grant-web Docker startup by shipping @swc/helpers ESM in the Next standalone bundle (next 16.3.2).

## 1.5.3

### Platform

**Docker images:** tagged `:1.5.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.3** (fixed group with apps).

### Patch Changes

- 178dd71: Code quality pass 5: stop re-emitting schema types, and remove dead surface.

  `codegen.ts` ran the `typescript` plugin alongside `typescript-resolvers`, so `src/generated/resolvers.ts` declared a second copy of all 464 schema type names already owned by `schema-types.ts`. It now imports them instead, taking the file from 7,347 to 3,548 lines. `src/index.ts`'s hand-curated 23-name resolver export list existed only to dodge the resulting identifier collision and is now a normal re-export, so all 115 `*Resolvers` types are available rather than 23.

  Removed from the public surface, none of which had a consumer in this repo:

  - `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES` — duplicates of `@grantjs/database` constants that are also backed by SQL `CHECK` constraints
  - `AUDIENCE_PRIMITIVES` and `EVENT_DELIVERY_CLASSES` — now union types (`AudiencePrimitive`, `EventDeliveryClass` are unchanged); the runtime arrays were unused
  - `AudienceRule`, `EventCatalogEntry` — internal to the event catalog

  Six unreferenced GraphQL declarations and three superseded operation documents were also removed; types reachable from `Query`/`Mutation` are unchanged at 207.

## 1.5.2

### Platform

**Docker images:** tagged `:1.5.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.2** (fixed group with apps).

### Patch Changes

- b072894: Fix notification text showing a raw i18n key (e.g. `roles.names.personalAccountOwner`) instead of the role's display name for system-role assign/revoke events. System roles now resolve to their translated label; the two `ACCOUNT_ROLES` (`personalAccountOwner`, `organizationAccountOwner`) that were missing an English/German translation entirely have been added.

## 1.5.1

### Platform

**Docker images:** tagged `:1.5.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.1** (fixed group with apps).

### Patch Changes

- a720d40: Align webhook create with full-page create viewers and route webhook/notification UI data through Apollo.

  Replace the create dialog with a `/webhooks/new` create viewer (shared events DataTable for create and edit), polish the one-time signing-secret dialog, and migrate webhooks and notifications hooks off REST so idle 401s refresh via Apollo like the rest of the dashboard.

## 1.5.0

### Platform

**Docker images:** tagged `:1.5.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.5.0** (fixed group with apps).

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

## 1.4.2

### Platform

**Docker images:** tagged `:1.4.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.4.2** (fixed group with apps).

### Patch Changes

- 4d1f378: Resolve user primary tags within the active project scope so shared email-imported users keep the correct project-specific primary tag.

## 1.4.1

### Platform

**Docker images:** tagged `:1.4.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.4.1** (fixed group with apps).

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.
- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.

## 1.4.0

### Platform

**Docker images:** tagged `:1.4.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.4.0** (fixed group with apps).

### Minor Changes

- fd61e91: Add CDM email identity imports for project sync jobs.

  CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.

## 1.3.3

### Platform

**Docker images:** tagged `:1.3.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.3** (fixed group with apps).

### Patch Changes

- 661935f: Fix project import failures caused by globally unique soft-delete timestamp indexes on pivot tables.

## 1.3.2

### Platform

**Docker images:** tagged `:1.3.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.2** (fixed group with apps).

### Patch Changes

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.
- ed06fc0: Fix the release workflow Docker matrix expression so GitHub Actions can parse
  `release.yml` and run the release pipeline after merges to `main`.

## 1.3.1

### Platform

**Docker images:** tagged `:1.3.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.1** (fixed group with apps).

### Patch Changes

- 2f5b331: Fix the release workflow Docker matrix expression so GitHub Actions can parse
  `release.yml` and run the release pipeline after merges to `main`.

## 1.3.0

### Platform

**Docker images:** tagged `:1.3.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.3.0** (fixed group with apps).

### Minor Changes

- b911b9a: CDM searchable metadata and denormalized `search_document` for list search, plus tag picker infinite scroll fix.

  **API & CDM**

  - Add `search_document` on `project_users`, `roles`, and `groups` with pg_trgm indexes
  - CDM `searchable` on user, role, and group inputs; import, export, and runtime recomputation
  - Project-scoped user list search filters via pivot `search_document`

  **Web**

  - Fix toolbar tag filter infinite loading (nested dropdown scroll, stable tag query variables, IntersectionObserver reconnect)

## 1.2.0

### Platform

**Docker images:** tagged `:1.2.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.2.0** (fixed group with apps).

### Minor Changes

- 3355be1: RBAC detail UX, direct permission assignments, and CDM replace pivot teardown.

  **Web**
  - Settings-style feature module cards and dedicated `/new` + detail routes for roles, groups, permissions, resources, project apps, and users
  - Slim list edit dialogs (scalar fields only); relationship editing on detail pages
  - Paginated tag pickers, detail table column visibility, and sync job detail pages

  **API & database**
  - Direct assignment pivots: `user_groups`, `user_permissions`, `role_permissions`, and project-scoped mirrors
  - CDM import/export for explicit user→group and user→role permission paths (no synthetic roles)
  - Replace-mode CDM teardown sweeps orphan pivots (including `project_app_tags`) with monotonic microsecond stagger soft-delete
  - Scoped entity tag resolvers; slim GraphQL list queries (`getRolesList`, `getGroupsList`, etc.)

  **Testing & tooling**
  - E2E coverage for rich replace import teardown and direct `users[].groups` authorization
  - RBAC list-query benchmark script; gitignore ephemeral benchmark outputs under `docs/benchmarks/`

## 1.1.7

### Platform

**Docker images:** tagged `:1.1.7` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.7** (fixed group with apps).

### Patch Changes

- 3597d0a: Compact audit log payloads before insert so large CDM entities (for example resources with long action lists) no longer exceed `varchar(1000)` on audit tables and abort import transactions.

## 1.1.6

### Platform

**Docker images:** tagged `:1.1.6` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.6** (fixed group with apps).

### Patch Changes

- 50b8271: Allow project-level API keys to enqueue CDM sync and export jobs by mapping `enqueuedById` to the system user when the JWT `sub` is the API key id sentinel (`sub === jti`), fixing FK violations on `project_sync_jobs.enqueued_by_id`.

## 1.1.5

### Platform

**Docker images:** tagged `:1.1.5` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.5** (fixed group with apps).

### Patch Changes

- 1d6f27d: Make the Express JSON request body limit configurable via `API_JSON_BODY_LIMIT_BYTES` (default 10 MiB) so large CDM sync imports can be tuned without code changes.

## 1.1.4

### Platform

**Docker images:** tagged `:1.1.4` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.4** (fixed group with apps).

### Patch Changes

- 6abd436: Skip `su-exec` in the API Docker entrypoint when the container already runs as a non-root user, fixing startup on Kubernetes with `securityContext.runAsUser`.

## 1.1.3

### Platform

**Docker images:** tagged `:1.1.3` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.3** (fixed group with apps).

### Patch Changes

- 8c9af41: Skip storage directory chown in the API Docker entrypoint when the container is not running as root, so Kubernetes deployments with `readOnlyRootFilesystem` and `securityContext.runAsUser` can start successfully.

## 1.1.2

### Platform

**Docker images:** tagged `:1.1.2` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.2** (fixed group with apps).

### Patch Changes

- 01e0ed1: Fix GraphQL codegen duplicate schema types by splitting `schema-types` and operation outputs. Compile the API for production Docker images (replace `tsx` runtime), align REST routes and web hooks with generated types, and fix demo storage volume permissions via entrypoint.

## 1.1.1

### Platform

**Docker images:** tagged `:1.1.1` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.1** (fixed group with apps).

### Patch Changes

- 005ec00: Resolve platform version from `apps/api/package.json` at runtime for `/api/config` and OpenAPI. Remove deprecated `APP_VERSION` and `NEXT_PUBLIC_APP_VERSION` environment variables.

## 1.1.0

### Platform

Async CDM project sync jobs, export, and pre-sync rollback snapshots. **Breaking:** synchronous `syncProject` / `POST .../permissions/sync` removed — use enqueue-and-poll job APIs (see migration notes in package changelogs).

**Docker images:** tagged `:1.1.0` and `:latest` after this release.

**npm packages:** `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` at **1.1.0** (fixed group with apps).

## 1.0.0

### Platform

Initial semver release of the Grant platform.

**Docker images** (GHCR, `ghcr.io/grant-js/grant/`):

- `grant-api`
- `grant-web`
- `grant-docs`
- `example-nextjs`

Tags: `:1.0.0`, `:latest` (from current `:demo` build). Rolling demo continues to use `:demo` and `:sha-<commit>`.

**npm packages** (registry.npmjs.org):

- `@grantjs/schema@1.0.0`
- `@grantjs/client@1.0.1` (includes MFA step-up callback)
- `@grantjs/server@1.0.0`
- `@grantjs/cli@1.0.0`

### Highlights

- Multi-tenant RBAC API (GraphQL + REST), web dashboard, and documentation site
- Publishable SDKs: browser client, server adapters, CLI
- Demo deployment via Docker Compose (`:demo` images + `.env.demo`)
