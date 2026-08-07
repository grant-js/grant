# Code quality: `apps/api`

**Pass 1** · 2026-08-06 · commit `46de9a9d` · 595 files, ~71,292 lines

Method and lens definitions: [Code quality passes](./README.md).

## Summary

**The architecture holds.** Every structural rule in `AGENTS.md` passes with zero violations:

| Lens                                        | Result |
| ------------------------------------------- | ------ |
| Handlers importing repositories             | 0      |
| Repositories importing services or handlers | 0      |
| REST/GraphQL importing repositories         | 0      |
| Services importing handlers                 | 0      |
| `console.*` in source                       | 0      |
| Deep relative imports (`../../`+)           | 0      |
| `*Handler` classes outside `handlers/`      | 0      |
| `process.env` outside `config/`             | 0      |
| Commented-out code blocks                   | 0      |

Transport reaches the domain only through `context.handlers` — [`types/context.ts:12`](https://github.com/grant-js/grant/blob/main/apps/api/src/types/context.ts) puts `handlers` on `RequestContext` and deliberately omits `services`. (`AppContext` at `:29` does expose `services`, correctly: it serves jobs and bootstrap, which are not transport.) That is a hexagonal architecture actually being maintained, not merely documented.

**What has drifted is everything the layering rules do not mechanically prevent.** The API layer is heavily duplicated (43 of 67 services share one 30-line block), has five implementations of pagination, carries ~115 dead exports, and uses two different words for the same table. Three genuine correctness bugs surfaced during the audit.

Only 3 `TODO` comments exist in the entire application. This codebase is not neglected — it is _repetitive_, which is the failure mode of a well-understood pattern applied by hand 60 times.

---

## Tier 0 — Correctness bugs {#tier-0-correctness-bugs}

### 0.1 Un-awaited cache mutation inside a transaction

[`handlers/tags.handler.ts:99`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/tags.handler.ts) and [`:142`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/tags.handler.ts)

```ts
this.addTagIdToScopeCache(scope, tagId); // :99  — async, not awaited
this.removeTagIdFromScopeCache(scope, tagId); // :142 — async, not awaited
```

Both methods are `async` ([`cache-handler.ts:679`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/base/cache-handler.ts), [`:683`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/base/cache-handler.ts)). The calls sit inside a `withTransaction` block, so the transaction can commit before the cache write resolves — and a rejection becomes an unhandled promise rejection rather than a failed request.

> **Correction (slice 3).** This entry originally claimed _"Every other cache mutation in the codebase is awaited."_ **That was false.** Enabling `@typescript-eslint/no-floating-promises` found **12 more instances of the identical defect** across `api-keys` (×3), `roles` (×2), `permissions` (×2), `projects` (×2), `groups` (×2) and `users` (×1) handlers, plus two unrelated floating promises in `oauth-state.service.ts` (a `setInterval` whose rejection would be process-fatal) and `email-then-mfa-compose.ts` (an async auth guard bypassing Express error handling).
>
> The lens that found one instance by reading was reported as a complete result. **Grep found the instance; only the type-aware rule found the pattern.** Where a lint rule exists for a finding, run it before stating a count.

### 0.2 `hasNextPage` computed, discarded, then recomputed differently

[`repositories/webhook-deliveries.repository.ts:169-186`](https://github.com/grant-js/grant/blob/main/apps/api/src/repositories/webhook-deliveries.repository.ts) over-fetches `options.limit + 1` rows, derives `hasNextPage` from the extra row, trims — then returns only `{ rows, totalCount }`. The computed value is dropped on the floor.

[`services/webhook-subscriptions.service.ts:213`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/webhook-subscriptions.service.ts) then recomputes it with a different formula, `offset + rows.length < totalCount`, against a `totalCount` from a separate `count(*)` query.

The keyset-style over-fetch is the more reliable of the two signals and it is the one being thrown away. Net effect: one wasted row per page, dead code in the repository, and two sources of truth for one boolean.

### 0.3 An import rule with no compliant path

[`services/api-keys.service.ts:10`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/api-keys.service.ts) imports `NoSessionSigningKeyError` from `@grantjs/core`, which `AGENTS.md` forbids — but `@/lib/errors` does not re-export it. The re-export list at [`lib/errors/error-classes.ts:2-13`](https://github.com/grant-js/grant/blob/main/apps/api/src/lib/errors/error-classes.ts) covers nine domain errors and omits `NoSessionSigningKeyError`, `TokenExpiredError`, `TokenInvalidError`, and `TokenValidationError`.

This is a gap in the guardrail, not in the code. The other six occurrences in [Tier 1](#tier-1-guardrail-gaps) are genuine violations; this one cannot be fixed without first widening the re-export.

---

## Tier 1 — Guardrail gaps {#tier-1-guardrail-gaps}

Rules already documented in `AGENTS.md`, violated in a countable and mechanically fixable way.

### Import discipline

| Finding                                                       | Count | Locations                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain errors from `@grantjs/core` instead of `@/lib/errors`  | 7     | `lib/jwks.lib.ts:3`, `lib/jobs/tenant-job.validation.ts:1`, `jobs/system-signing-key-rotation.job.ts:1`, `jobs/project-sync.job.ts:7`, `services/signing-keys.service.ts:9`, `middleware/error.middleware.ts:1`, `services/api-keys.service.ts:10` (see [0.3](#tier-0-correctness-bugs)) |
| `./common/PivotRepository` instead of `@/repositories/common` | 7     | `organization-project-api-keys`, `project-user-api-keys`, `account-projects`, `group-tags`, `organization-groups`, `account-project-api-keys`, `organization-permissions` repositories                                                                                                   |

`@grantjs/logger` and `@grantjs/errors` are imported only inside `src/lib/logger/` and `src/lib/errors/` — the sanctioned re-export layer. Not violations.

### Error handling

Nine raw `throw new Error(` where a domain exception belongs:

| File                                                                                                                                              | Lines                     | Should be                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------- |
| [`repositories/project-import.repository.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/repositories/project-import.repository.ts) | `196, 202, 224, 230, 233` | `NotFoundError` / `ConflictError` / `ValidationError` |
| [`jobs/project-sync.job.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/jobs/project-sync.job.ts)                                   | `291, 298`                | `ValidationError` / `ConflictError`                   |
| [`services/project-import.service.ts:543`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/project-import.service.ts)           |                           | `ConfigurationError`                                  |
| [`graphql/resolvers/index.ts:30`](https://github.com/grant-js/grant/blob/main/apps/api/src/graphql/resolvers/index.ts)                            |                           | `ConfigurationError`                                  |

`project-import.repository.ts` holds five of nine, throwing bare sentinel strings (`'PERMISSION_NOT_FOUND'`, `'PERMISSION_AMBIGUOUS'`) that reach the HTTP layer with no status mapping.

### Logging

`AGENTS.md` requires `context.requestLogger` in request-scoped code so logs carry `requestId`. The pattern is established — 59 references exist — but 14 call sites use module- or instance-level loggers instead:

| File                                                                                                                                  | Logger declared | Call sites                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| [`middleware/validation.middleware.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/middleware/validation.middleware.ts) | `:63`           | `:70, :72, :77, :82, :91, :93, :99, :108` — all inside the returned middleware, where `req` is in scope |
| [`rest/utils/auth.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/utils/auth.ts)                                   | `:13`           | `:176, :366`                                                                                            |
| [`rest/routes/auth.routes.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/routes/auth.routes.ts)                   | `:49`           | `:301, :396`                                                                                            |
| [`handlers/oauth.handler.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/oauth.handler.ts)                     | `:54`           | `:178, :188`                                                                                            |
| [`handlers/project-oauth.handler.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/project-oauth.handler.ts)     | `:104`          | `:653`                                                                                                  |

`auth.routes.ts` is the clearest signal: it uses `context.requestLogger` correctly at `:159, :164, :201, :215` and the module logger at `:301, :396` — the file disagrees with itself.

[`handlers/auth.handler.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/auth.handler.ts) shows the compliant pattern to copy: `(requestLogger ?? this.logger).error(...)` with an optional `requestLogger?: ILogger` parameter.

Three handlers declare a logger field and never use it — dead fields at `me.handler.ts:54`, `users.handler.ts:61`, `organization-invitations.handler.ts:50`.

### Ports

`AGENTS.md` step 4 requires an `I*Service` port in `packages/@grantjs/core/src/ports/services/` for every service. 64 of 67 comply.

| Finding                        | Detail                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No port at all                 | `WebhookDeliveryService` ([`:38`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/webhook-delivery.service.ts)), `NotificationDeliveryService` ([`:23`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/notification-delivery.service.ts)), `EventRelayService` ([`:16`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/event-relay.service.ts)) |
| Port outside `ports/services/` | `EmailService` implements `IEmailService` from `ports/email.port.ts`; no `ports/services/email.service.port.ts` exists and `ports/services/index.ts` does not export it                                                                                                                                                                                                                                 |
| Repositories with no port      | `ProjectImportRepository`, `ProjectExportRepository` — while the sibling `ProjectSyncJobRepository` has one                                                                                                                                                                                                                                                                                             |
| Naming                         | `IFileStorageServicePort` breaks the `I*Service` convention; `AccountTagsService` (plural) implements `IAccountTagService` (singular)                                                                                                                                                                                                                                                                   |

No orphaned ports — all 59 interfaces under `ports/services/` have exactly one implementation.

Handlers inject port types throughout, with two exceptions in [`project-oauth.handler.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/project-oauth.handler.ts): a concrete `AuthHandler` at `:115` (handler-to-handler injection) and a concrete `Grant` at `:117`.

### Configuration

`process.env` reads are fully centralized — zero occurrences outside `config/`. What leaked is literals.

| Finding                                             | Locations                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded scheme+host while `config.app.url` exists | [`server.ts:161-164`](https://github.com/grant-js/grant/blob/main/apps/api/src/server.ts) — four `http://localhost:${config.app.port}/...` strings. `config.app.url` is used correctly at `rest/openapi/config.openapi.ts:119`                                                                                                                                                |
| TTLs outside config, not env-overridable            | [`constants/cache.constants.ts:31, 37, 43`](https://github.com/grant-js/grant/blob/main/apps/api/src/constants/cache.constants.ts) — three `= 600` OAuth TTLs                                                                                                                                                                                                                 |
| Pagination limits                                   | `services/notifications.service.ts:21-22`, `services/webhook-subscriptions.service.ts:40`, `lib/audit/serialize-audit-payload.lib.ts:2`                                                                                                                                                                                                                                       |
| **Conflicting defaults for one concept**            | default page size `10` at [`graphql/resolvers/tags/queries/get-tags.resolver.ts:8`](https://github.com/grant-js/grant/blob/main/apps/api/src/graphql/resolvers/tags/queries/get-tags.resolver.ts) vs `50` at [`repositories/organization-members.repository.ts:38`](https://github.com/grant-js/grant/blob/main/apps/api/src/repositories/organization-members.repository.ts) |
| Cache-control literal                               | `middleware/storage.middleware.ts:20` — `maxAge: 31536000`, while adjacent options read `config.storage.local.*`                                                                                                                                                                                                                                                              |
| External CDN in an email template                   | `lib/email/templates/base.mjml.ts:40` — Google Fonts                                                                                                                                                                                                                                                                                                                          |

### Misfiled shared code

Six GraphQL resolvers import `setRefreshTokenCookie` / `clearRefreshTokenCookie` from `@/rest/utils/refresh-cookie` — `auth/mutations/{login,register,verify-mfa,verify-mfa-recovery-code,refresh-session}.resolver.ts` and `me/mutations/logout-my-user.resolver.ts`. Cookie handling is shared transport concern, not REST-owned; it belongs in `lib/`.

Separately, [`handlers/index.ts:6`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/index.ts) imports `Services` and wires all 18 handlers — a third composition site, where `AGENTS.md:46` names only `context.middleware.ts` and `lib/app-context.lib.ts`. Either the rule or the file should change.

---

## Tier 2 — Abstraction opportunities {#tier-2-abstraction-opportunities}

Ordered by lines removed per unit of risk. Each is a **helper existing classes call** — no new base classes, no inheritance changes, no layer reshaping.

### 2.1 Delete + audit + event block — 43 of 67 services

The largest single block of repetition in the app. Every soft/hard delete repeats:

```ts
const isHardDelete = hardDelete === true;
const deleted = isHardDelete ? repo.hardDeleteX(...) : repo.softDeleteX(...);
const oldValues = { /* hand-picked fields */ };
const auditMetadata = { context, hardDelete };
if (isHardDelete) { await this.audit.logHardDelete(...); }
else { await this.audit.logSoftDelete(..., { ...oldValues, deletedAt }); }
await this.events.publish({ type: 'x.deleted', ... });
```

Verified verbatim at [`groups.service.ts:226-259`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/groups.service.ts) and [`roles.service.ts:221-249`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/roles.service.ts), plus 41 more including `user-tags:213`, `group-tags:188` _and_ `:235`, `user-roles:179`, `role-permissions:163`, `account-projects:178`, `project-roles:128`.

Measured near-identity with the entity name normalized away: `roles.service.ts` ↔ `groups.service.ts` is **180 of 221 non-blank lines (81%)**.

A `resolveDelete()` helper in `services/common/` takes the repo pair, the value snapshot, the audit logger and the event descriptor. ~30 lines × 43 files → ~8 lines × 43 files.

### 2.2 `CacheHandler` — ~590 of 888 lines are mechanical

[`handlers/base/cache-handler.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/base/cache-handler.ts) has three self-similar regions:

| Region                         | Lines     | Shape                                                                                              |
| ------------------------------ | --------- | -------------------------------------------------------------------------------------------------- |
| 9 × `getScopedXIds`            | `221-677` | cache read → `switch (scope.tenant)` → map `.xId` → cache write → `default: throw BadRequestError` |
| 22 × add/remove wrappers       | `679-749` | one-line delegates to `addIdToCache` / `removeIdFromCache`                                         |
| 8 × `invalidateXCacheForScope` | `812-863` | identical 3 lines, differing only by cache namespace                                               |

Replace with a descriptor table keyed by entity kind plus generic `getScopedIds(kind, scope)`, `mutateScopeCache(kind, scope, id, op)` and `invalidateForScope(kind, scope)`. **Keep every existing public method as a one-line delegate** — no handler changes, no test churn, and the change stays reviewable.

Two smaller defects in the same file:

- `invalidateSigningKeysCacheForScope` (`:873`) rebuilds `${scope.tenant}:${scope.id}` inline instead of calling `createCacheKey` (`:187`).
- **Two live methods with identical bodies**: `invalidateAuthorizationResultsForUser` (`:837`, protected, used by `users.handler.ts:368,575,912`) and `invalidateAuthorizationCacheForUser` (`:880`, public, used by `organization-members.handler.ts:40,54`). Pick one.
- Never called: `invalidateRolesCacheForAllScopes` (`:755`), `invalidateGroupsCacheForAllScopes` (`:759`).

### 2.3 REST CRUD routers are literal copies

[`roles.routes.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/routes/roles.routes.ts) and [`permissions.routes.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/routes/permissions.routes.ts) are **byte-for-byte identical** after substituting `Role`↔`Permission` — both 158 lines. [`groups.routes.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/routes/groups.routes.ts) differs by **import ordering only**. `tags.routes.ts` and `resources.routes.ts` follow the same shape.

Every one repeats the same four routes with the same middleware order: `validate` → `requireEmailThenMfaRest` → `authorizeRestRoute` → handler → `sendSuccessResponse`.

A `createCrudRouter({ resource, schemas, handler })` factory collapses ~790 lines to a factory plus ~30 lines per entity.

### 2.4 List + `validateOutput` block — 12 services

```ts
const transformedResult = { items: result.groups, totalCount, hasNextPage };
validateOutput(
  createDynamicPaginatedSchema(schema, params.requestedFields),
  transformedResult,
  context
);
return result; // ← transformedResult discarded
```

[`groups.service.ts:73-85`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/groups.service.ts), `roles:80-92`, `permissions:61-72`, plus `users`, `projects`, `organizations`, `organization-invitations`, `project-apps`, `resources`, `tags`, `accounts`, `api-keys`. The reshaped object exists only to satisfy the generic schema and is then thrown away — a wasted allocation on every list request, twelve times over.

### 2.5 Smaller extractions

| Opportunity                             | Sites                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Handler empty-scope early return        | 9+ handlers — `tags:56`, `roles:76`, `groups:66`, `permissions:75`, `users:114` and `:130`, `resources:83`, `projects:122`, `api-keys:54`, `project-apps:72`                                                             |
| `scope.id.split(':')` parsing           | 8 sites — `cache-handler.ts:113,128,160,178` plus `grant.repository.ts:369`, `mfa-org-requirement.ts:30`, `jwks.lib.ts:77`, `jwks.routes.ts:53`. One `lib/scope.lib.ts`                                                  |
| `EntityRepository.buildFilterCondition` | [`:135`](https://github.com/grant-js/grant/blob/main/apps/api/src/repositories/common/EntityRepository.ts) — two duplicated 16-line `switch (filter.operator)` blocks (`:185-200`, `:209-224`) differing only in operand |

### 2.6 Base classes that exist but are opted out of

| Base                                   | Adoption           | Opted out                                                                                                                                                                                                                |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EntityRepository` / `PivotRepository` | 52 / 62            | `grant` (621 L), `project-export` (881 L), `project-import` (767 L), `project-sync-job`, `organization-members`, `webhook-deliveries`, `notifications`, `webhook-subscriptions`, `notification-preferences`, `event-log` |
| `CacheHandler`                         | 16 / 18            | `project-oauth.handler.ts` (815 L), `organization-invitations.handler.ts` (639 L)                                                                                                                                        |
| Base service                           | **does not exist** | `services/common/` holds only zod helpers                                                                                                                                                                                |

The ten base-less repositories each re-implement querying, pagination, and `isNull(deletedAt)` by hand — the direct cause of the pagination divergence in [3.1](#tier-3-divergent-styles).

---

## Tier 3 — Divergent styles {#tier-3-divergent-styles}

### 3.1 Pagination — five formulas, no cursor

| Formula                                   | Location                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `page * limit < totalCount`               | `repositories/common/EntityRepository.ts:323`                                                                |
| `safePage * paginationLimit < totalCount` | `repositories/organization-members.repository.ts:288`                                                        |
| `totalCount > page * limit`               | `services/project-sync-job.service.ts:182`                                                                   |
| `offset + rows.length < totalCount`       | `services/notifications.service.ts:85`, `services/webhook-subscriptions.service.ts:213`                      |
| over-fetch `limit + 1`                    | `repositories/webhook-deliveries.repository.ts:169` (result discarded — see [0.2](#tier-0-correctness-bugs)) |

`rg -n "cursor" apps/api/src` returns **zero hits**, despite Relay-style `hasNextPage` naming throughout. Offset paging is the de-facto choice; it should be stated rather than implied.

### 3.2 Validation gaps at the service boundary

Twelve services never call `validateInput`: `email`, `event-relay`, `file-storage`, `grant`, `me`, `notification-delivery`, `notifications`, `project-export`, `project-sync-job`, `signing-keys`, `user-mfa`, `webhook-delivery`. Six more skip `validateOutput`.

**Security-relevant:** [`project-import.service.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/project-import.service.ts) (550 L) and [`project-sync-job.service.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/project-sync-job.service.ts) (492 L) process externally-supplied CDM payloads with no zod boundary at the service layer.

### 3.3 Domain events — 22 of 67 services publish

No `tag.*`, no `project.created`, no `user.created`. The asymmetry is visible in the wiring: [`services/index.ts:312`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/index.ts) constructs `TagService` with repo + audit only, while `:313-317` gives the structurally identical `GroupService` an `events` publisher.

Consumers cannot rely on the event stream being complete, which limits what webhooks and notifications can be built on.

### 3.4 Audit coverage — 14 services audit nothing

Including mutating ones: `project-import`, `project-export`, `webhook-subscriptions`, `oauth-state`, `github-oauth`, `notifications`.

Cosmetic but telling: the same object is named `metadata` at `roles.service.ts:128` and `auditMetadata` at `groups.service.ts:125` — in files that are otherwise 81% identical.

### 3.5 Transactions — three styles, plus code that opens none

| Style                                            | Where                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `this.db.withTransaction`                        | handlers                                                              |
| `txConn.withTransaction`                         | jobs, delivery services                                               |
| Raw Drizzle `db.transaction` (bypasses the port) | `jobs/project-sync.job.ts:277`, `middleware/context.middleware.ts:90` |

[`handlers/project-oauth.handler.ts`](https://github.com/grant-js/grant/blob/main/apps/api/src/handlers/project-oauth.handler.ts) — 815 lines of mutating OAuth consent and membership flows — uses **zero** transactions.

### 3.6 Soft delete

`EntityRepository.softDelete` and `PivotRepository.softDelete` are separate implementations. [`webhook-subscriptions.repository.ts:148`](https://github.com/grant-js/grant/blob/main/apps/api/src/repositories/webhook-subscriptions.repository.ts) additionally flips `active: false` — a side effect no other soft delete has, and one a caller reading the base-class contract would not expect.

---

## Tier 4 — Dead surface

Roughly **115 exports** occur exactly once — at their own definition — cross-checked against `apps/api`, `apps/api/tests`, `apps/web/src`, and `packages/`.

> **Resolved in slice 4 — and the count was wrong three times over.** `knip` reports **361** findings, not 115, and they split into three edits of very different risk: 90 dead barrel re-exports (the implementation lives on), 149 module-private symbols (drop the `export` keyword, nothing moves), and 124 genuine deletions. A further 13 dead methods on `CacheHandler` were invisible to knip, which does not analyse class members. See [corrections 10–12](#corrections). `apps/api` is now clean and [CI enforces it](https://github.com/grant-js/grant/blob/main/.github/workflows/ci.yml).

Whole unused families:

| Surface                                  | Detail                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/common/validation.ts`          | `safeValidateInput` (`:110`), `safeValidateOutput` (`:126`) — the entire "safe" half                                                                                                                                                                    |
| `rest/types/requests.ts`                 | `TypedRequestBody`, `TypedRequestAll`, `TypedRequestParams`, `TypedRequestQuery`, `TypedRequestBodyParams`, `TypedRequestBodyQuery`, `TypedRequestParamsQuery`, `InferBody`, `InferParams`, `InferQuery` — everything except the generic `TypedRequest` |
| `services/common/schemas.ts`             | 10 of 39 exports (`entityIdSchema`, `paginationSchema`, `searchFilterSchema`, `sortSchema`, …)                                                                                                                                                          |
| `*PageSchema`                            | ~14, superseded by `createDynamicPaginatedSchema`                                                                                                                                                                                                       |
| `add*ArgsSchema` / `remove*ParamsSchema` | ~35 pairs where the service validates with a differently-named schema                                                                                                                                                                                   |
| Misc                                     | `lib/errors/grant-error-mapper.ts:14`, `lib/rls/rls-context.ts:113`, `middleware/request-logging.middleware.ts:118`, `lib/token.lib.ts:44`, `rest/utils/auth.ts:19` and `:52`                                                                           |

**Orphaned REST contracts** — schemas defined for endpoints that were never built or were removed. These are worth separating from ordinary clutter because they signal abandoned work:

> **Wrong — see [correction 12](#corrections).** They signal nothing of the sort. Every one has a live `my*`-prefixed counterpart already wired into both `me.routes.ts` and `me.openapi.ts`: `changePasswordRequestSchema` → `changeMyPasswordRequestSchema`, `deleteAccountBodySchema` → `deleteMyAccountsBodySchema`, `getUserSessionsQuerySchema` → `getMyUserSessionsQuerySchema`, and so on. The endpoints ship and work; the `me`-scoped rewrite left the originals behind. Superseded duplicates, deleted in slice 4.

- `uploadUserPictureRequestSchema` / `ResponseSchema` ([`rest/schemas/users.schemas.ts:202,217`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/schemas/users.schemas.ts)) — no route registers them, though the GraphQL mutation exists
- The `deleteAccount*` and `createAccount*` sets in `rest/schemas/accounts.schemas.ts`
- `changePassword*`, `loginResponseSchema` in `rest/schemas/auth.schemas.ts`
- `getUserSessions*`, `revokeUserSession*`, `getUserAuthenticationMethods*`, `exchangeProjectUserApiKey*`, `createProjectUserApiKey*`

### REST / GraphQL parity

Both transports correctly delegate to the same handler methods — no duplicated business logic. But the surfaces have diverged:

**GraphQL-only:** `assignUserPermission` / `revokeUserPermission` (`mutations.ts:113,121`), `assignRolePermission` / `revokeRolePermission` (`:155,163`), `uploadUserPicture` (`:105`).

**REST-only:** OAuth callback and consent flows, JWKS, runtime config, sync-job payload/snapshot fetch (`projects.routes.ts:212,246`).

**Behavioural divergence on the same operation** — these are defects, not gaps:

1. `login` — REST injects `providerData.action = Login` ([`auth.routes.ts:65`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/routes/auth.routes.ts)); GraphQL passes args straight through. [`user-authentication-methods.service.ts:357-366`](https://github.com/grant-js/grant/blob/main/apps/api/src/services/user-authentication-methods.service.ts) switches on that field, so the two transports take **different service branches**.
2. `refreshSession` — GraphQL clears the refresh cookie when missing; REST throws.
3. `refreshSession` — REST returns `{ accessToken }` only; GraphQL returns the full result with refresh metadata.

---

## Tier 5 — Ubiquitous language {#tier-5-ubiquitous-language}

Recorded in [`CONCEPTS.md`](https://github.com/grant-js/grant/blob/main/CONCEPTS.md). **No renames in this pass** — several of these reached the public contract.

### 5.1 `member` vs `user` — two full stacks over one table

The highest-cost naming defect in the codebase. `organization_users` is served by two parallel implementations:

| "user" stack                                            | "member" stack                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `services/organization-users.service.ts` (270 L)        | `services/organization-members.service.ts` (289 L)                                       |
| `repositories/organization-users.repository.ts` (164 L) | `repositories/organization-members.repository.ts` (398 L)                                |
| —                                                       | `handlers/organization-members.handler.ts`, `rest/routes/organization-members.routes.ts` |

Both query the same `organizationUsers` table. GraphQL and REST say _member_; the database, ports, and half the services say _user_. [`organization-users.repository.ts:104`](https://github.com/grant-js/grant/blob/main/apps/api/src/repositories/organization-users.repository.ts) uses both terms **in a single comment**.

### 5.2 Abbreviations in a public URL

[`rest/routes/jwks.routes.ts:45`](https://github.com/grant-js/grant/blob/main/apps/api/src/rest/routes/jwks.routes.ts) serves `/org/:orgId/prj/:projectId/.well-known/jwks.json`. `prj` appears nowhere else in the codebase. `orgId` appears 22 times against 462 for `organizationId`.

The documentation disagrees with itself about the same scope format: `orgId:projectId` (`rest/openapi/project-apps.openapi.ts:51`) vs `organizationId:projectId` (`handlers/base/cache-handler.ts:182`).

Being in a URL and in `signing-keys.service.ts:41`'s `'org-prj-'` key prefix makes this a contract, not a rename.

### 5.3 `Tenant` is really "scope kind"

`Scope = { tenant, id }` where `Tenant` ∈ `Account | Organization | OrganizationProject | AccountProject | ProjectUser | …`. `tenantId` has **zero occurrences**; the actual tenancy roots are `accountId` (260) and `organizationId` (462). Against `AGENTS.md`'s "multi-tenant RBAC platform", `Tenant` reads as a false cognate.

### 5.4 ProjectSync has a third vocabulary at REST

Class names follow `AGENTS.md` correctly. But REST exposes `POST /:id/sync/jobs` (start sync), `POST /:id/sync/jobs/export` (start export), `DELETE /:id/sync/jobs/:jobId` (cancel) — which never line up 1:1 with `startProjectSync` / `startProjectExport` / `cancelProjectSync` in GraphQL.

### 5.5 Structural naming inconsistencies

| Convention             | Deviations                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handler class number   | singular `TagHandler`, `GroupHandler`, `UserHandler` vs plural `ApiKeysHandler`, `SigningKeysHandler`, `ProjectAppsHandler`, `WebhookSubscriptionsHandler`, `OrganizationMembersHandler` |
| kebab-case filenames   | `repositories/common/EntityRepository.ts`, `PivotRepository.ts` — the only PascalCase files in `src/`                                                                                    |
| `*.schemas.ts`         | `account-project-tags.schema.ts`, `organization-project-tags.schema.ts` (singular, 2 of 47)                                                                                              |
| Router factory name    | `createGroupsRouter` / `createProjectsRouter` vs `createAuthRoutes` / `createApiKeysRoutes`; `createUserRoutes` is singular in `users.routes.ts`                                         |
| `lib/` file suffix     | `search-document.lib.ts`, `token.lib.ts` vs `expiration-date.ts`, `permission-normalizer.ts`                                                                                             |
| Pivot `toEntity` param | `dbPivot` (`role-tags.repository.ts:21`) vs `dbGroupTag` (`group-tags.repository.ts:22`)                                                                                                 |

---

## Tier 6 — Coverage

121 test files: 89 unit, 12 integration, 20 e2e. Weighted by lines at risk:

| Untested                                   | Lines |
| ------------------------------------------ | ----- |
| `rest/openapi/`                            | 8,197 |
| `rest/routes/`                             | 3,458 |
| `config/env.config.ts`                     | 1,051 |
| `handlers/base/cache-handler.ts`           | 888   |
| `repositories/common/` (both base classes) | 742   |
| `hydrators/` + `resource-resolvers/`       | 464   |

The base classes are the priority: `EntityRepository`, `PivotRepository` and `CacheHandler` are inherited by 52, and 16 subclasses respectively, so an untested base is a defect multiplier — and [2.2](#tier-2-abstraction-opportunities) proposes refactoring one of them.

63 repositories share 4 test files. Service unit tests skew toward event emission (8 `*.events.test.ts`) over CRUD and validation paths; the ~50 pivot services have no unit tests at all. REST routes are exercised only indirectly through integration and e2e suites.

---

## Corrections

Errors in this document found while acting on it. Recorded rather than silently edited, because the pattern in them is the useful part.

| #   | Original claim                                                                                                                                     | Reality                                                                                                                                                                                                                                                                                                                                                          | Found in |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | One un-awaited cache mutation; "every other cache mutation is awaited"                                                                             | **13 total**, across 7 handlers, plus 2 unrelated floating promises                                                                                                                                                                                                                                                                                              | slice 3  |
| 2   | 9 raw `throw new Error(`                                                                                                                           | **10** — the grep missed `const err = new Error(...)` in `project-sync.job.ts`                                                                                                                                                                                                                                                                                   | slice 2  |
| 3   | 9 raw throws are all violations                                                                                                                    | **5 are a deliberate sentinel protocol** that `lib/cdm/permission-ref.lib.ts` maps to domain errors, with tests                                                                                                                                                                                                                                                  | slice 2  |
| 4   | 3 dead logger fields                                                                                                                               | **1** — the other two use the compliant `(requestLogger ?? this.logger)` fallback                                                                                                                                                                                                                                                                                | slice 2  |
| 5   | `IEmailService` is a service port in the wrong directory                                                                                           | It is an **adapter port** (`MailgunEmailAdapter implements IEmailService`); `ports/email.port.ts` is correct                                                                                                                                                                                                                                                     | slice 2  |
| 6   | `AUDIT_VALUE_MAX_LENGTH` should move to config                                                                                                     | It mirrors `varchar(1000)` on the audit tables; env-tunable would let config exceed the column                                                                                                                                                                                                                                                                   | slice 2  |
| 7   | `handlers/index.ts` is a third composition site                                                                                                    | It is a layer factory, identical in shape to `services/index.ts` and `repositories/index.ts`, which went unflagged                                                                                                                                                                                                                                               | slice 2  |
| 8   | Default page size: "10 vs 50"                                                                                                                      | **Five** values (10, 20, 25, 50) plus a dead `defaultPageSize: 20` in config that nothing read                                                                                                                                                                                                                                                                   | slice 2  |
| 9   | Repository ports are a mechanical fix                                                                                                              | ~12 return types are declared **inside** the repositories; the ports require migrating them into core first                                                                                                                                                                                                                                                      | slice 2  |
| 10  | ~115 dead exports                                                                                                                                  | **361** findings, and they are three different edits — see below                                                                                                                                                                                                                                                                                                 | slice 4  |
| 11  | 2 never-called `CacheHandler` methods                                                                                                              | **13** — knip does not analyse class members, so this needed a separate AST scan                                                                                                                                                                                                                                                                                 | slice 4  |
| 12  | Orphaned `uploadUserPicture*` / `deleteAccount*` / `changePassword*` schemas signal "an abandoned feature" needing a wire-it-or-delete-it decision | Every one has a live `my*`-prefixed counterpart already wired into `me.routes.ts` **and** `me.openapi.ts`. The endpoints ship. They are superseded duplicates, and there was no decision to make                                                                                                                                                                 | slice 4  |
| 13  | `metadata` vs `auditMetadata` is a cosmetic divergence in otherwise line-identical files                                                           | **Load-bearing.** `groups.service.ts` binds `metadata` from `validatedParams` because a Group has a metadata field; `auditMetadata` disambiguates. Renaming fails to compile (`TS2451`)                                                                                                                                                                          | slice 6  |
| 14  | 43 services share a 30-line delete block a helper would collapse                                                                                   | The 30 lines are a whole method, not an extractable unit. Normalized, the 43 audit branches are 3 semantic variants; the dominant one (32 of 43) is already **5 lines**, so a helper call would be longer                                                                                                                                                        | slice 6  |
| 15  | Five `hasNextPage` formulas; pick one and migrate the other four                                                                                   | **Two are correct.** Three sites spell one count-based comparison three ways and did collapse. The other two over-fetch `limit + 1` deliberately: the surplus row shares the page's snapshot, so it cannot disagree with the rows just returned. Migrating them to the count formula is a regression, not a consolidation                                        | slice 8  |
| 16  | CDM payloads "cross the service boundary unvalidated"; add zod to two services                                                                     | CDM sync is **GraphQL-only** — no REST route — so field presence, scalar types, nested shapes and unknown-field rejection already fire before a resolver runs, and 7 `*.cdm-entity.ts` classes add hand-rolled checks on top. The real gap is narrower: the 12 `JSON` scalar fields, which assert nothing and are read back through `as Record<string, unknown>` | slice 8  |
| 17  | Tier 0 bug 1.2 (repository computes a next-page signal, discards it, service recomputes) is one occurrence                                         | **Two.** `notifications.repository.ts` has the identical defect and the audit missed it — found only by reading every pagination site while consolidating them. A grep for the symptom would not have found it; the discarded variable is named differently                                                                                                      | slice 8  |
| 18  | `repositories/common/` and `config/env.config.ts` are untested surface needing coverage                                                            | True, and writing the coverage surfaced three latent defects the audit never saw: filters widen silently on a typo, `PivotRepository.countActive({})` counts the whole table, and `validateConfig`'s `DB_URL` branch is unreachable. Coverage is a **detector**, not just a safety net — it belongs earlier in the rubric than "tests"                           | slice 9  |

Correction 10 is the most useful of the set. "~115 dead exports" was one number covering three edits with different risk:

| Class                 | Count | Edit                                            |
| --------------------- | ----- | ----------------------------------------------- |
| Dead barrel re-export | 90    | delete the barrel line; implementation lives on |
| Module-private        | 149   | drop the `export` keyword; no code moves        |
| Genuinely dead        | 124   | delete the declaration                          |

Only the third is a deletion. Reporting them as one number would have made the slice look four times more dangerous than it was, and would have hidden that the largest group is an encapsulation fix rather than a removal.

Five lessons, folded into [the rubric](./README.md):

1. **Run the tool before stating the count.** Corrections 1, 2, 10 and 11 are all grep under-counting what a type-aware rule or a parser finds exactly.
2. **A rule violation is not automatically a defect.** Corrections 3, 5, 6, 7 and 12 are all cases where the code was right and the rule — or my reading of it — was wrong. Check for an intentional design before filing.
3. **"Mechanical" is a claim that needs testing.** Correction 9 was sized as an import fix and is actually a question about what the domain owns.
4. **Count findings by the edit they imply, not by the tool's issue type.** Correction 10.
5. **A tool has a scope; state it.** knip reads module exports, not class members (correction 11) and cannot see string-resolved references — `pino-pretty` is named only as a pino transport target, so it reads as an unused dependency and removing it would break dev logging with no build error.

## Recommended enforcement

Every Tier 1 finding is mechanically checkable. Adding these locks in the currently-passing lenses at near-zero cost:

| Check                                                         | Catches                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `@typescript-eslint/no-floating-promises`                     | [0.1](#tier-0-correctness-bugs)                                      |
| `no-restricted-imports` encoding the `AGENTS.md` symbol table | 14 import violations                                                 |
| `eslint-plugin-boundaries` or `dependency-cruiser`            | Layer DAG — **currently 100% clean**, so this locks in a green state |
| `knip` or `ts-prune` in CI                                    | ~115 dead exports                                                    |

The layer-boundary rule is the highest-value item on this list precisely _because_ it currently finds nothing.

## Backlog

See [`plans/2026-08-06-api-code-quality-stack.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-06-api-code-quality-stack.md).

---

## Pass-1 close-out — resolved counts (2026-08-07)

Re-run of the measurable lenses after slices 1–9 merged into `feat/api-code-quality`. "Now" is measured, not asserted; where a number did not reach zero the reason and the follow-up id are given.

| Lens                                          | Audit              | Now                    | Note                                                                                                                                                                                                         |
| --------------------------------------------- | ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **L1** Layer-boundary violations              | 0                  | **0**                  | Handlers→repositories, repositories→services, transport→repositories all still zero                                                                                                                          |
| **L2** Domain errors from `@grantjs/core`     | 7                  | **0**                  | The 2 remaining importers are `lib/errors/*` — the sanctioned re-export layer                                                                                                                                |
| **L2** `@grantjs/errors` outside `lib/errors` | —                  | **0**                  | Both importers are inside `lib/errors/`                                                                                                                                                                      |
| **L2** `createLogger` from `@grantjs/logger`  | 14 sites / 4 files | **0**                  | The 1 remaining importer is `lib/logger/logger.ts`, the re-export layer                                                                                                                                      |
| **L2** Relative `./common/PivotRepository`    | 7                  | **0**                  |                                                                                                                                                                                                              |
| **L2** Raw `throw new Error(`                 | 9                  | **5**                  | All five are deliberate sentinels in `project-import.repository.ts`, documented at `:166` and caught in `lib/cdm/permission-ref.lib.ts:77`. Not a violation — a control-flow signal that predates the rule   |
| **L2** `console.*`                            | 0                  | **0**                  |                                                                                                                                                                                                              |
| **L2** Deep relative imports                  | 0                  | **0**                  |                                                                                                                                                                                                              |
| **L2** `*Handler` outside `handlers/`         | 0                  | **0**                  |                                                                                                                                                                                                              |
| **L5** Dead exports (knip)                    | 361                | **0**                  | Gated in CI and pre-push since slice 4, verified against a planted violation                                                                                                                                 |
| **L5** Dead `CacheHandler` methods            | 13                 | **0**                  |                                                                                                                                                                                                              |
| **L3** `cache-handler.ts` lines               | 888                | **655**                | −26%, public method names unchanged                                                                                                                                                                          |
| **L4** `hasNextPage` implementations          | 5 formulas         | **2 named strategies** | `hasNextPageByCount` and `takePage`, with the choice rule in `CONCEPTS.md`                                                                                                                                   |
| **L3** `scope.id.split(':')` outside the lib  | 26                 | **24**                 | Slice 5 migrated `CacheHandler`'s four only — widening a security-full diff to 22 unrelated call sites would have made it harder to review. Follow-up **C2**                                                 |
| **L4** Services with zero `validateInput`     | 12                 | **12**                 | Slice 8 closed the CDM `JSON`-scalar gap, which is a different defect. Follow-up **C1**                                                                                                                      |
| **L7** Unit tests                             | —                  | **924**                | This story added `cache-handler.scoped-ids`, `cache-handler.mutations`, `scope.lib`, `pagination.lib`, `cdm-json.schemas`, `entity-repository.filters`, `pivot-repository`, `crud-router`, `validate-config` |

### What the close-out itself surfaced

Nothing new, which is the point of running it. But two of the "unchanged" rows are worth reading as findings rather than as omissions: **C1** and **C2** are both cases where a slice deliberately stopped short of a round number because finishing would have widened a diff that carried a security bar. That is the correct trade, and it is only visible because the counts were re-measured instead of assumed closed.

The rubric's own correction list grew to **18 entries** over this pass — see above. The single most repeated error was counting occurrences of a _shape_ and assuming each implied an extractable helper; four separate proposals were rejected on inspection, and three defects were found only by reading code the audit had already scored as clean.
