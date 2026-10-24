# Grant IAM performance diagnosis

**Audience:** Alejandro — strengths / weaknesses discussion  
**Scope:** performance only, post-[#588](https://github.com/grant-js/grant/pull/588) (`main` @ `9eff88e0`)  
**Method:** read-only code review. No load tests. No latency numbers invented.  
**Not this report:** security findings from the 2026-10-24 API audit (refresh `isVerified`, project-app bind, lockout, MFA budget, scope fail-closed, etc.). Those shipped in #588. This pass is what still costs time and what will break first as orgs, tenants, and permissions grow.

M7–M10 (cost clamp, org-member SQL paging, tenant-list paging, cascade chunking) are treated as **in**. Residuals below are what those slices did not close.

---

## Executive summary

The IAM request path is **well bounded at the public list edge** and **still expensive on every authenticated request**. #588 capped GraphQL depth/complexity and page size, paged org members and project-user hydration in SQL, and chunked IAM cascade outbox writes. Those were the right first cuts.

What remains is structural:

1. **Every scoped request holds a Postgres connection for the whole response** (`SECURITY_ENABLE_RLS=true`, default). Pool default is `DB_POOL_MAX=20`.
2. **The object graph is built per request** (~66 repositories + ~74 services + ~20 handlers; twice under RLS). Rate limiting runs _after_ that work.
3. **Tenant membership ID sets are still materialized in full** before a page is taken. M9 stopped loading every `project_users` _row_ for hydration; it did not stop `CacheHandler.resolveScopedIds` from loading every member id.
4. **A cache-miss `isAuthorized` is 5–6 sequential RBAC queries.** Any role/group/permission mutation then `permissions.clear()`s **all tenants**.

Those four dominate scale more than leftover N+1 field resolvers. GraphQL is the heavier transport (nested selection + per-parent resolvers). REST is flatter. Neither has query-level metrics today, so we cannot say which path is slower in production — only which one does more work in code.

**What breaks first at growth:** the connection pool (concurrency), then scoped-ID `IN (...)` lists and authz stampedes after IAM writes, then long cascade transactions and outbox/webhook volume. Permission-catalog growth hurts OAuth consent mint (`getGrantedScopeSlugs` is one full RBAC walk **per candidate slug**).

---

## Strengths

What is already efficient or well-bounded after #588.

| Area                    | What is good                                                                                                               | Evidence                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GraphQL abuse bound     | Depth + complexity validation before resolvers. List `limit` multiplies cost; `-1` counts as max page.                     | `createGraphqlCostValidationRules` in `apps/api/src/lib/graphql/query-cost.lib.ts`; wired in `apps/api/src/create-app.ts`. Knobs: `GRAPHQL_MAX_DEPTH` (15), `GRAPHQL_MAX_COMPLEXITY` (10000).                                                 |
| Public list page size   | Generic entity lists clamp `limit`; `-1` → max unless marked internal.                                                     | `clampPageLimit` / `unboundedList` in `apps/api/src/lib/pagination.lib.ts`; `EntityRepository.query` in `apps/api/src/repositories/common/EntityRepository.ts`. Knobs: `PAGINATION_DEFAULT_PAGE_SIZE` (50), `PAGINATION_MAX_PAGE_SIZE` (100). |
| Org members             | Page in SQL (`UNION ALL` + `ORDER` + `LIMIT/OFFSET`); batch hydrate the page only. REST schema is 1–100.                   | `OrganizationMemberRepository.getOrganizationMembers` in `apps/api/src/repositories/organization-members.repository.ts`.                                                                                                                      |
| Project-user hydration  | Metadata / name / picture load **page user ids**, not the whole tenant.                                                    | `UsersHandler.getUsers` in `apps/api/src/handlers/users.handler.ts`.                                                                                                                                                                          |
| List hydration          | Tags / counts for list queries batch when fields are requested.                                                            | `hydrateList` in `apps/api/src/lib/list-hydration/list-hydration.lib.ts`.                                                                                                                                                                     |
| Authz result cache      | Allow/deny cached until access-token expiry, keyed by user + scope + permission + context hash (+ project-app scope hash). | `AuthHandler.isAuthorized` + `CacheHandler.getAuthorizationCacheKey` in `apps/api/src/handlers/auth.handler.ts` and `apps/api/src/handlers/base/cache-handler.ts`. TTL follows `JWT_ACCESS_TOKEN_EXPIRATION_MINUTES` (15).                    |
| JWKS                    | Origin cache per issuer + HTTP `Cache-Control` + in-process `kid` PEM cache.                                               | `GrantService.getPublicKeysForJwks` / `getVerificationKey` in `apps/api/src/services/grant.service.ts`. Knobs: `JWT_JWKS_HTTP_CACHE_TTL_SECONDS` (30), `JWT_JWKS_MAX_AGE_SECONDS` (300), `JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS` (300).    |
| Cascade / outbox        | Concurrent revoke fan-out chunked; outbox rows inserted together.                                                          | `runInChunks` in `apps/api/src/lib/iam-cascade.lib.ts`; `runWithOutboxBatch` in `apps/api/src/lib/events/event-outbox-batch.lib.ts`. Knob: `IAM_CASCADE_CHUNK_SIZE` (50).                                                                     |
| Async delivery          | Event relay and webhook delivery are jobs with batch caps, not inline HTTP.                                                | `JOBS_EVENT_RELAY_BATCH_SIZE` (100), `JOBS_EVENT_RELAY_MAX_BATCHES` (50), `JOBS_WEBHOOK_DELIVERY_BATCH_SIZE` (50), `JOBS_WEBHOOK_DELIVERY_MAX_BATCHES` (20).                                                                                  |
| Existence checks        | `exists(id)` is one `SELECT 1 … LIMIT 1`, not count+row. Documented as a CDM win.                                          | `EntityRepository` in `apps/api/src/repositories/common/EntityRepository.ts`.                                                                                                                                                                 |
| Search indexes          | `project_users.search_document` trigram GIN + metadata GIN.                                                                | `packages/@grantjs/database/src/schemas/project-users.schema.ts`.                                                                                                                                                                             |
| Cheap RLS (most pivots) | Restrictive policy is `column = current_setting(...)`.                                                                     | e.g. `organization_users`, `project_users` in `packages/@grantjs/database/src/schemas/`.                                                                                                                                                      |
| GraphQL RBAC placement  | `authorizeGraphQLResolver` runs **once per top-level field**, not per nested field.                                        | `apps/api/src/lib/authorization/graphql-guard.ts`.                                                                                                                                                                                            |
| Auth compare cost       | Lockout still does a dummy bcrypt so a locked account costs the same as a miss.                                            | `AuthHandler.login` in `apps/api/src/handlers/auth.handler.ts`. Knob: `TOKEN_BCRYPT_ROUNDS` (10).                                                                                                                                             |
| Import / body caps      | CDM and JSON body have hard ceilings.                                                                                      | `CDM_IMPORT_MAX_ENTITIES` (5000), `CDM_UPLOAD_MAX_BYTES` (64 MiB), `API_JSON_BODY_LIMIT_BYTES` (10 MiB).                                                                                                                                      |
| Auth rate bucket        | GraphQL `login` / `register` / `refreshSession` share the REST auth limiter.                                               | `apps/api/src/lib/graphql-auth-rate-limit.lib.ts`. Knobs: `SECURITY_RATE_LIMIT_AUTH_MAX` / `_WINDOW_MINUTES`.                                                                                                                                 |

---

## Weaknesses (ranked)

### High — will dominate first

**H1. RLS holds a pool connection for the entire request**  
`contextMiddleware` opens `db.transaction`, `SET LOCAL ROLE` + tenant GUCs, then waits on `res` `finish`/`close`. `holdResponseEndUntil` also waits for after-commit work (`JOBS_AFTER_COMMIT_TIMEOUT_MS`, default 5000 ms).  
`SECURITY_ENABLE_RLS` defaults **true**. `DB_POOL_MAX` defaults **20**. Concurrent scoped GraphQL/REST requests compete for that pool; a slow handler or a slow after-commit enqueue occupies a connection the whole time. Unscoped / system / RLS-off paths skip the hold.  
Evidence: `apps/api/src/middleware/context.middleware.ts`.

**H2. Per-request composition, before rate limit**  
Every request constructs repositories + services + handlers + `Grant` + `authenticate`. Under RLS it does that **twice** (bootstrap db, then scoped tx). `createRestRouter(context)` is also allocated per `/api` request. Rate-limit middleware is mounted _after_ context (`create-app.ts`), so a 429 still paid JWT verify, `getUser`, and object-graph setup.  
Evidence: `createRepositories` (~66) in `apps/api/src/repositories/index.ts`; `createServices` (~74) in `apps/api/src/services/index.ts`; `createHandlers` in `apps/api/src/handlers/index.ts`.

**H3. Tenant ID sets are still full-table on cache miss**  
`CacheHandler.resolveScopedIds` loads every org/project pivot id into a `Set`, caches it, then list handlers pass that array as `ids` into `EntityRepository.query` (`IN (...)` + `count(*)` + `LIMIT/OFFSET`). M9 only narrowed **project-user pivot hydration** to the page. Tag filter and project search still run against the full id list (`getUserTagIntersection`, `filterUserIdsBySearchDocument`).  
`PivotRepository.query` has **no SQL LIMIT**.  
Evidence: `apps/api/src/handlers/base/cache-handler.ts`, `UsersHandler.getUsers`, `apps/api/src/repositories/common/PivotRepository.ts`.

**H4. Authz miss is a sequential RBAC walk; invalidation is global**  
`GrantService.getUserPermissions` (used by `PermissionChecker.check` ← `Grant.isAuthorized`):

1. `getUserRoleIdsInScope` (joins vary by tenant; project-app/API-key uses project roles only)
2. `getGroupIdsForRoles`
3. `getDirectGroupIdsForUser`
4. `getPermissionIdsForGroups`
5. `getDirectPermissionIdsForRoles`
6. `getDirectPermissionIdsForUser`
7. `getPermissionsByIds` (join resources)

Conditional permissions then add `getUser` + `getUserRoles` + `getUserGroups` and a role×group cartesian in `PermissionChecker.getRoleGroupCombinations`.  
Delete/assign/revoke call `invalidatePermissionsCacheForAllScopes()` → `cache.permissions.clear()` (Redis: `SCAN` + batched `DEL` of the **entire** permissions namespace). One IAM write in tenant A invalidates tenant B’s hot allow-cache. Per-user invalidation is `keys(prefix*)` then one `delete` per key.  
Evidence: `apps/api/src/services/grant.service.ts`, `apps/api/src/repositories/grant.repository.ts`, `packages/@grantjs/core/src/core/permission-checker.ts`, `CacheHandler.invalidatePermissionsCacheForAllScopes`, `packages/@grantjs/cache/src/redis/index.ts`.

### Medium — leftover or designed cost

**M1. GraphQL field resolvers still N+1 when list hydration did not run**  
List queries batch tags/counts. Single-entity, nested, or unhydrated fields hit the DB per parent:

- `userRolesResolver` → scoped role ids + unbounded `getRoles` (`apps/api/src/graphql/resolvers/users/fields/roles.resolver.ts`)
- `groupTagsResolver` / other `*/fields/tags.resolver.ts` → pivot + `getTags(unboundedList)`
- `getGroupPermissions` / `getUserGroups` / `getUserPermissions` / `getResourceById` — one call per parent

No DataLoader. A dashboard query that lists 50 users and asks `roles { … }` without going through `hydrateList` is 50–100 extra queries, still inside the complexity cap.

**M2. Project OAuth mint/refresh walks RBAC once per consented slug**  
`GrantService.getGrantedScopeSlugs` loops `candidateSlugs` and calls `getUserPermissions` each time. `ProjectOAuthHandler.signProjectScopedToken` does this on authorize-code exchange and refresh. An app with many scopes pays N × the H4 walk (uncached as a set).  
Evidence: `apps/api/src/services/grant.service.ts` ~168–186; `apps/api/src/handlers/project-oauth.handler.ts`.

**M3. IAM cascade is chunked, not short**  
`GroupHandler.deleteGroup` (and role/permission deletes) still run **one** `withTransaction`. Chunking only limits `Promise.all` width and outbox `INSERT` batch size. One event per subject remains. A large group still holds H1’s connection and writes O(members) outbox rows.  
Evidence: `apps/api/src/handlers/groups.handler.ts`; `IAM_CASCADE_CHUNK_SIZE`.

**M4. Field selection does not prune columns; lists always `count(*)`**  
Docs say repositories select only requested columns (`docs/advanced-topics/field-selection.md`). `EntityRepository.query` uses `findMany` with optional `with` for **relations**. Scalar columns are not projected. Every list also runs `getTotalCount`. Offset pagination only (`pagination.lib.ts`: no keyset). Deep pages (`OFFSET` large) plus a huge `IN (ids)` is the leftover tenant-list cost after M9.

**M5. Missing reverse indexes on hot IAM pivots**  
`user_roles` has unique `(user_id, role_id)` only — **no `role_id` index**. Cascade `getUserRoles({ roleId })` and `getUserRoleIdsInScope` joins that filter `user_roles.user_id` are fine; lookups by `role_id` are not. `user_groups` / `user_permissions` unique keys also lead with `user_id`, so delete-by-group/permission is the weak direction. `role_groups` unique leads with `role_id` (good for role→group; weaker for group delete).  
Evidence: `packages/@grantjs/database/src/schemas/user-roles.schema.ts` and siblings.

**M6. Email on the request (sometimes in the transaction)**  
`AuthHandler.register` awaits `email.sendOtp` inside `withTransaction`. Password-reset paths also send in-request. Adapter latency (SMTP/SES/…) holds the handler and, on register, the DB transaction. Storage adapters are off the list hot path (picture upload/read).

**M7. Observability cannot answer “which IAM query is slow”**  
`lib/metrics` records HTTP duration/count labeled `method`, `route`, `status_code`. GraphQL is one route (`/graphql`). No cache hit/miss, no DB histogram, no `isAuthorized` miss counter, no pool wait. Tracing exists (`TRACING_ENABLED`, default false) but is not IAM-shaped. `METRICS_ENABLED` defaults false.

**M8. Session authenticate always re-reads the user**  
`Grant.getAuth` calls `grantService.getUser(userId)` on every session token (id + metadata only; extra `project_users` read if a project scope is later used in condition eval). API-key / project-app skip this. Cheap per call; it is on **every** dashboard request and is not cached.

### Low — smaller leftovers

**L1.** `WebhookSubscriptionService.list` returns every subscription for the project (deliveries _are_ paged).  
**L2.** `event_log` RLS uses `scope_id LIKE '%' || project_id` (weak for index use). `webhook_delivery_attempts` RLS is an `EXISTS` subquery on `webhook_subscriptions`. Relay jobs run as owner and skip this; tenant-scoped reads pay it.  
**L3.** Default `CACHE_STRATEGY=memory` — not shared across instances; multi-replica production without Redis will stampede H3/H4. Redis `clear()`/`keys()` are SCAN-based (good) but still O(keyspace) on IAM writes.  
**L4.** Public `limit: -1` is clamped silently to 100. Web hooks and some OpenAPI text still say “all”. Pickers can truncate without an error.  
**L5.** Refresh-reuse revoke walks the session family and publishes per member (`UserSessionService.revokeSessionFamily`). Happy-path refresh is a CAS rotate + auth-method read + JWT sign — fine. Theft path is the spike.  
**L6.** Login extras after #588: lockout upsert on `durableDb` (outside the request tx) + bcrypt. Correct and bounded; it is still extra writes on the hottest unauthenticated path.

---

## Hot-path notes

### Login / refresh / session

| Step             | Login (`AuthHandler.login`)                                                                                                       | Refresh (`refreshSession` → `UserSessionService.refreshSessionByRefreshToken`) |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Lookup           | Auth method by provider + id                                                                                                      | Session by current refresh hash                                                |
| Extra after #588 | Lockout record-before-verify on pool (`AUTH_MAX_FAILED_LOGIN_ATTEMPTS` / `AUTH_LOCKOUT_DURATION_MINUTES`); dummy bcrypt if locked | Reuse of a rotated secret → `revokeSessionFamily` (N soft-deletes + outbox)    |
| Secret cost      | `TOKEN_BCRYPT_ROUNDS` (10) via `verifyCredentialPassword`                                                                         | Hash compare of refresh secret (not bcrypt-of-password)                        |
| Session          | Create session + sign JWT (`JWT_ACCESS_TOKEN_EXPIRATION_MINUTES` 15, refresh days 30)                                             | CAS rotate refresh; `isVerified` from auth method; sign JWT                    |
| MFA              | Not on this path; verify budget is cache get/set (`AUTH_MFA_VERIFY_MAX_ATTEMPTS` / `_WINDOW_MINUTES`)                             | `mfaVerified` from `user_sessions.mfaVerifiedAt`                               |

Login is CPU-bound on bcrypt and write-bound on session + lockout + audit/outbox. Refresh is a short write unless reuse revoke fires. Both share the GraphQL/REST auth rate bucket.

### GraphQL vs REST

Same handler stack after transport. Differences that cost:

- GraphQL: depth/complexity check, then **one `isAuthorized` per top-level field**, then nested field resolvers (M1). One HTTP request can multiply RBAC + SQL.
- REST: one `isAuthorized` per route; `?relations=` adds JOINs (documented as slower at 3+).
- GraphQL list `limit` is clamped in the repository (same as REST). Complexity uses the same max page as a multiplier.
- Metrics collapse all GraphQL to `/graphql`.

### Authorization (`Grant.isAuthorized`)

Order: authenticate → project-app scope cap (fail-closed if empty) → `PermissionChecker` → four permission-source unions (role→group, user→group, role→permission, user→permission) → optional conditions.  
Cache sits on `AuthHandler.isAuthorized` (the GraphQL/REST guard), not inside `Grant`. First check of each `(user, scope, resource, action, context)` per token lifetime pays H4. Dashboard pages that ask many distinct permissions warm the cache; IAM mutations flush everyone.

### JWKS

HTTP `GET` JWKS: cache key `jwks:{tenant}:{id}` in `cache.signingKeys`, TTL `JWT_JWKS_HTTP_CACHE_TTL_SECONDS`. Response also has `Cache-Control: max-age=JWT_JWKS_MAX_AGE_SECONDS`. Verification uses `kid` → PEM cache (`JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS`). Miss is a small signing-key read (`limit: -1` internal / `unboundedList`). This path is no longer a per-request DB tax for chatty verifiers.

### Project-app OAuth

Consent/token/refresh: PKCE + grant rotate (reuse revoke, same family pattern as sessions) + `signProjectScopedToken`. The performance cliff is **M2** (per-slug RBAC), not JWT sign. Hosted pages add cache-backed state/code TTLs (`PROJECT_OAUTH_*_TTL_SECONDS`). Password sign-in has the same lockout pattern as platform login (already shipped).

---

## Bottlenecks — what breaks first

As **org membership** grows: H3 (full id sets + `IN` + `count(*)`), then org-member SQL (now paged, but search is `ILIKE` on name/email JSON and two count queries), then notification membership fan-out (`loadMembershipSets` still loads all members per event).

As **project users** grow: same H3; search is better (trigram on `search_document`) but still filtered by the full id list in process. Offset pages get slower as `page * limit` grows.

As **roles / groups / permissions** grow: H4 query count stays ~constant per check (good), but each IN-list and join widens; conditional permissions go cartesian (roles × groups). OAuth apps with large allowlists hit M2 first. Cascade delete duration and outbox size hit M3.

As **concurrent API traffic** grows: H1 (pool of 20) before CPU. H2 allocation cost is per request on the event loop. Multi-instance without Redis (L3) multiplies H3/H4 stampedes.

As **webhook subscribers** grow: relay/delivery jobs are batched (strength); cascade still enqueues one event per subject (M3). Delivery timeout `WEBHOOKS_DELIVERY_TIMEOUT_MS` is per attempt, off the request except after-commit enqueue.

---

## Measured (committed benchmarks)

`docs/benchmarks/report.md` (also linked from the data-model docs) is a **2026-07-20** local snapshot of `POST /api/auth/is-authorized` — not production, and it predates #588. Scope: CDM-imported `accountProject`, ~371 permissions, ~272 users, 20 runs per check.

| Check                                      | mode             | p50     | p95       | Target         |
| ------------------------------------------ | ---------------- | ------- | --------- | -------------- |
| Project.Query                              | cold             | 11 ms   | **23 ms** | p95 &lt; 50 ms |
| Project.Query                              | warm             | 4 ms    | **5 ms**  | p95 &lt; 15 ms |
| Permission.Query / Role.Query / deny paths | cold             | 9–10 ms | 10–13 ms  | same           |
| same, warm                                 | warm             | 4 ms    | 5–8 ms    | same           |
| Project.Query throughput                   | 30 cold, conc. 3 | —       | 34 ms     | 156 checks/s   |

Warm is ~2–4× faster than cold (AuthHandler result cache). Deny is as expensive as allow. This is the published p95 we have. It does **not** cover login, refresh, or dashboard GraphQL.

## Open questions (cannot know from code)

No production metrics or post-#588 re-run were reviewed. Do **not** treat the following as measured:

- p50 / p95 / p99 for login, refresh, or dashboard GraphQL; production `isAuthorized`; or this bench on `main` after #588.
- Authz and scoped-ID cache hit rates (memory vs Redis vs DynamoDB).
- Pool wait time vs handler time vs after-commit wait.
- Whether `GRAPHQL_MAX_COMPLEXITY=10000` is tight for the real dashboard or still roomy for aliases.
- How large real tenants are (members, project users, permission slugs per app).
- RLS CPU vs application-scope cost under load (`EXPLAIN` not run).
- Email/storage adapter latency in the deployed environment.
- Whether `CACHE_STRATEGY` in production is already Redis (default in code is `memory`).
- CDM import wall-clock at the 5,000-entity cap (docs mention a 900 s in-process ceiling; not re-measured here).

Useful if you want a next measurement pass (not implementing): re-run `pnpm benchmark:authz` on current `main` and publish a new `docs/benchmarks/report.md`; HTTP p95 by route with GraphQL operation name; cache hit ratio on `permissions` and scoped-id namespaces; Postgres `pg_stat_activity` wait while RLS txs are open; one k6/Artillery script for login + `users` list + `isAuthorized` at 1k / 10k / 50k members.

---

## Knob index (performance-relevant)

| Knob                                                        | Default                   | Where it bites                                               |
| ----------------------------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `DB_POOL_MAX` / `DB_POOL_MIN`                               | 20 / 2                    | Concurrent scoped requests (H1)                              |
| `DB_QUERY_TIMEOUT`                                          | 60000 ms                  | Runaway SQL                                                  |
| `SECURITY_ENABLE_RLS`                                       | true                      | Connection hold (H1)                                         |
| `JOBS_AFTER_COMMIT_TIMEOUT_MS`                              | 5000                      | Response hold after COMMIT                                   |
| `GRAPHQL_MAX_DEPTH`                                         | 15                        | Nested selection                                             |
| `GRAPHQL_MAX_COMPLEXITY`                                    | 10000                     | Field × page-size product                                    |
| `PAGINATION_DEFAULT_PAGE_SIZE` / `PAGINATION_MAX_PAGE_SIZE` | 50 / 100                  | All public lists + GraphQL cost multiplier                   |
| `IAM_CASCADE_CHUNK_SIZE`                                    | 50                        | Concurrent revokes / outbox insert width — **not** tx length |
| `JWT_ACCESS_TOKEN_EXPIRATION_MINUTES`                       | 15                        | Authz cache TTL                                              |
| `JWT_JWKS_HTTP_CACHE_TTL_SECONDS`                           | 30                        | Origin JWKS                                                  |
| `JWT_JWKS_MAX_AGE_SECONDS`                                  | 300                       | CDN / client JWKS                                            |
| `JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS`                  | 300                       | `kid` + signing key                                          |
| `TOKEN_BCRYPT_ROUNDS`                                       | 10                        | Login CPU                                                    |
| `CACHE_STRATEGY` / `CACHE_DEFAULT_TTL`                      | memory / 3600             | Multi-instance + scoped-id TTL                               |
| `SECURITY_RATE_LIMIT_*` / `_AUTH_*` / `_PER_TENANT_*`       | 100/15m; 20/15m; optional | Request _count_, not work per request                        |
| `JOBS_EVENT_RELAY_*` / `JOBS_WEBHOOK_DELIVERY_*`            | 100×50 / 50×20            | Async backlog drain                                          |
| `CDM_IMPORT_MAX_ENTITIES`                                   | 5000                      | Import transaction size                                      |

---

## Discussion takeaway

#588 made the **public list and GraphQL cost surface** look like a product you can take to a large org without an unbounded query. The **request chassis** (pool hold, composition, full tenant id maps, global authz flush, per-slug OAuth RBAC) is still sized for a single-node / mid-size tenant mental model. That is the honest strengths-and-weaknesses split: edge queries are bounded; the inner IAM engine is correct, cached, and still chatty.
