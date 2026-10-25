---
title: Permission Evaluation Benchmarks
description: Latency and throughput for POST /api/auth/is-authorized
---

# Permission Evaluation Benchmarks

Summary of **permission evaluation** performance via `POST /api/auth/is-authorized` — the path SDKs and app guards use on every authorized request. Raw dated dumps from `pnpm benchmark:authz` stay local; this page is the committed report.

This bench is **H4** (the RBAC walk + AuthHandler result cache). It is **not** a measurement of H1 pool wait. A request that is fast here can still occupy a Postgres client for the whole response; see [How to watch the parking spot](#how-to-watch-the-parking-spot-h1) below.

Dashboard GraphQL list queries are out of scope here; see [Field Selection](/advanced-topics/field-selection) for UI payload shape guidance.

## Environment

| Field              | Value                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Date**           | 2026-10-25                                                                                                                                                                                                               |
| **SHA**            | `85a82b19` (`main` after H3 [#605](https://github.com/grant-js/grant/pull/605) and version packages [#606](https://github.com/grant-js/grant/pull/606); this docs slice does not change the API)                         |
| **API**            | Local (`http://localhost:4000`), `NODE_ENV=development`                                                                                                                                                                  |
| **Datastore**      | PostgreSQL 16 and Redis 7 via Compose (`postgres:16-alpine`, `redis:7-alpine`) on the same ports as the example stack                                                                                                    |
| **Rate limit**     | Off for this series only (`SECURITY_ENABLE_RATE_LIMIT=false` in gitignored `.env.local`). The published 20-run series plus throughput exceeds the production default of 100 requests / 15 minutes. Not a product change. |
| **Scope**          | `accountProject` (fresh personal-account project on the seed permission model)                                                                                                                                           |
| **Catalog size**   | 68 permissions, 2 users (system + bench). **Not** the 2026-07-20 CDM-imported project (~371 permissions, ~272 users).                                                                                                    |
| **Endpoint**       | `POST /api/auth/is-authorized`                                                                                                                                                                                           |
| **Runs per check** | 20                                                                                                                                                                                                                       |
| **Throughput**     | 30 cold checks, concurrency 3                                                                                                                                                                                            |
| **Host**           | Linux 6.12, 4 CPUs, 16 GiB RAM                                                                                                                                                                                           |

Cold runs vary `context.resource.id` so each call bypasses the AuthHandler result cache and exercises real evaluation. Warm runs reuse a fixed context after a prime request (cache hit).

Rate limit was off for this series (`SECURITY_ENABLE_RATE_LIMIT=false` in gitignored `.env.local` only). The table below is that run.

## Results

| Check                      | mode | p50 (ms) | p95 (ms) | min | max | mean | authorized | reason                            | ok  | Target               |
| -------------------------- | ---- | -------- | -------- | --- | --- | ---- | ---------- | --------------------------------- | --- | -------------------- |
| allow: Project.Query       | cold | 14       | 37       | 9   | 47  | 17   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass (p95 &lt; 50ms) |
| allow: Project.Query       | warm | 6        | 9        | 4   | 10  | 6    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass (p95 &lt; 15ms) |
| allow: Permission.Query    | cold | 13       | 17       | 9   | 18  | 13   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Permission.Query    | warm | 5        | 8        | 4   | 8   | 5    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Role.Query          | cold | 9        | 13       | 8   | 14  | 10   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Role.Query          | warm | 4        | 5        | 4   | 7   | 4    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| deny: unknown resource     | cold | 9        | 23       | 8   | 29  | 11   | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: unknown resource     | warm | 4        | 7        | 4   | 8   | 5    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: ungranted CDM action | cold | 9        | 12       | 7   | 13  | 9    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: ungranted CDM action | warm | 4        | 6        | 4   | 7   | 4    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |

### Throughput

| Check                       | total | concurrency | wall (ms) | checks/s | p50 | p95 | ok  |
| --------------------------- | ----- | ----------- | --------- | -------- | --- | --- | --- |
| allow: Project.Query (cold) | 30    | 3           | 198       | **152**  | 16  | 36  | yes |

## Targets

Published targets are unchanged. This story does **not** invent a new H4 p95.

- Cold evaluation **p95 &lt; 50ms**
- Warm (cached) **p95 &lt; 15ms**
- Allow/deny outcomes match expectations
- Zero HTTP errors

All checks met these targets on this run.

## Previous snapshot (2026-10-24)

Last committed numbers before this re-run, on `f3abf2ef` (H1 trunk `feat/iam-request-chassis`, pre-#600 / #605). Same seed catalog (68 permissions / 2 users), local `http://localhost:4000`. Cold Project.Query p95 was 32 ms; warm 8 ms; throughput 146 checks/s. The older **2026-07-20** CDM-imported snapshot (~371 permissions / ~272 users; cold p95 10–23 ms, warm 5–8 ms; 156 checks/s) is still not current.

## Observed cold-miss query shape (2026-10-25)

One isolated `POST /api/auth/is-authorized` allow (`Project.Query`, unique `context.resource.id`, API-key `accountProject`, unconditional grant). Postgres `log_min_duration_statement=0` for this call only. Not a p95. HTTP wall for that single first call was 52.4 ms (JWT verify + RLS GUC setup + walk); the published series above is the latency picture.

`GrantService.getUserPermissions` still awaits the walk **in order**. All seven `GrantRepository` methods ran because a role, role-groups, and permission IDs were present. No `getUser` / `getUserRoles` / `getUserGroups` — those fire only for conditional grants.

| #   | Method                           | SQL (shape)                                                                | execute (ms) | parse+bind (ms) |
| --- | -------------------------------- | -------------------------------------------------------------------------- | ------------ | --------------- |
| 1   | `getUserRoleIdsInScope`          | `account_project_api_keys.account_role_id` by apiKeyId + account + project | 0.049        | 0.214           |
| 2   | `getGroupIdsForRoles`            | `role_groups.group_id` `IN` 1 role                                         | 0.032        | 0.734           |
| 3   | `getDirectGroupIdsForUser`       | `user_groups` ⋈ `project_user_groups` (apiKeyId as userId)                 | 0.010        | 1.244           |
| 4   | `getPermissionIdsForGroups`      | `group_permissions.permission_id` `IN` 16 groups                           | 0.045        | 0.654           |
| 5   | `getDirectPermissionIdsForRoles` | `role_permissions` ⋈ `project_role_permissions` `IN` 1 role                | 0.010        | 1.049           |
| 6   | `getDirectPermissionIdsForUser`  | `user_permissions` ⋈ `project_user_permissions`                            | 0.009        | 1.071           |
| 7   | `getPermissionsByIds`            | `permissions` ⟕ `resources` `IN` 51 ids + `lower(action)` / `lower(slug)`  | 0.102        | 1.582           |

Execute sum of the seven is **0.26 ms**. Sequential round-trips plus parse/bind dominate the walk, not row work. Diagnosis H4 (5–6 queries; 7 when every source is present) is still true after H1–H3. No EXPLAIN named a missing reverse index (M5) as blocking this walk — execute times are sub-millisecond on the seed catalog.

## Interpretation

### What is being measured

Each call unions permission sources for the caller in scope (role→group, user→group, role→permission, user→permission), matches action + resource, then evaluates conditions when present. See [Architecture Overview → Permission Evaluation](/architecture/overview#permission-evaluation).

| Mode           | Meaning                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| **Cold**       | Cache-busted evaluation — closest to “first check” cost after deploy or for a new resource context  |
| **Warm**       | AuthHandler cache hit — typical repeat check for the same permission + context within the token TTL |
| **Throughput** | Bounded-concurrency cold checks — rough sustained capacity under light parallel load                |

This is the H4 **after-H1–H3 picture** for permission-check latency. It does not prove the request transaction client is back in the pool. H1 hold, H2 composition, and H3 scoped list SQL are unchanged.

### Allow vs deny

Deny paths (`NO_MATCHING_PERMISSION_FOUND`) are in the same band as allow on this seed catalog — the engine still collects and filters permission IDs; absence of a match is not a cheap short-circuit before that work. That is the right property for security; it also means deny traffic is not “free.”

### Cache effect

Warm p95 (5–9 ms) is roughly **2–4×** faster than cold p95 (12–37 ms). Integrations that re-check the same permission+context benefit from the server-side authorization cache automatically.

### Takeaways

- Permission evaluation stays under 50 ms p95 cold on this seed-sized project after H1–H3.
- Cached checks are single-digit milliseconds.
- ~150 cold checks/s at concurrency 3 on a local API is a useful floor for capacity planning (staging/production will differ with hardware, catalog size, and pool size).
- A cache-miss walk still pays **seven sequential** `GrantRepository` queries when every source is present. That is the H4 leftover.
- Avoid unbounded parallel fan-out against `is-authorized` from a single client; use modest concurrency (the benchmark defaults to 3).
- A production-shaped global rate limit (100 / 15 min) cannot finish this published series. Turn rate limit off, or raise `SECURITY_RATE_LIMIT_MAX`, for a local re-run only.

## How to watch the parking spot (H1)

H1 is the RLS request transaction that keeps a pool client checked out until COMMIT. `contextMiddleware` opens `db.transaction`, runs `SET LOCAL ROLE` + tenant GUCs, and holds that client until the handler ends the response (`finish` / `close` + `holdResponseEndUntil`). COMMIT then returns the client to the pool. After-commit work (jobs / webhooks) runs on the pool afterward, then the body is flushed. `DB_POOL_MAX` defaults to **20**. Unscoped, system, and `SECURITY_ENABLE_RLS=false` paths do not open this transaction.

There is **no** pool-checkout or pool-wait metric today. Do not read `http_request_duration_seconds` / `http_requests_total` (the existing Prometheus series when `METRICS_ENABLED=true`) as time-in-pool — those are HTTP duration and count, labeled `method`, `route`, `status_code`.

While a **scoped** GraphQL or REST request is in flight, watch the parking spot in Postgres:

```sql
SELECT pid,
       usename,
       state,
       xact_start,
       query_start,
       state_change,
       wait_event_type,
       wait_event,
       left(query, 80) AS query
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
ORDER BY xact_start NULLS LAST;
```

A scoped request that has finished its last tenant query but has not COMMITed yet shows as **`idle in transaction`** (or `active` if a query is still running). `xact_start` is when that parking spot was taken. A short count:

```sql
SELECT count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_tx,
       count(*) FILTER (WHERE state = 'active') AS active
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
```

To hold a request long enough to see it, issue a scoped call that you can pause on the client (or add a temporary handler delay locally — do not commit that). After COMMIT the client is back; after-commit no longer occupies the parking spot.

## How to reproduce

```bash
pnpm benchmark:authz -- --base-url http://localhost:4000 --runs 20
# alias: pnpm benchmark:rbac
```

Optional flags:

- `--throughput 30` — total cold checks in the throughput phase (`0` to skip)
- `--concurrency 3` — max in-flight requests during throughput

Optional env:

- `GRANT_API_BASE_URL` — API base URL
- `GRANT_BENCHMARK_CREDENTIALS` — path to API key credentials JSON (`clientId`, `clientSecret`, `scope`)

Credentials may include a custom `checks` array (`name`, `permission`, `expectAuthorized`) to override the defaults. For `accountProject`, `scope.id` is `accountId:projectId`.

The published series is larger than the production default rate-limit window. For a local API started from the example `.env` (`NODE_ENV=production`), set `SECURITY_ENABLE_RATE_LIMIT=false` or raise `SECURITY_RATE_LIMIT_MAX` in a gitignored `.env.local` before measuring.

Script: `scripts/benchmarks/permission-evaluation.mjs`. Fresh dated JSON/MD files are written under `docs/benchmarks/` as `authz-{date}.*` (gitignored except this report and the README).

## Related

- [Architecture Overview](/architecture/overview#permission-evaluation) — evaluation diagram
- [RBAC](/architecture/rbac) — permission sources and evaluation steps
- [Data Model](/architecture/data-model) — core authorization EER
- [Client SDK](/integration/client-sdk) / [Server SDK](/integration/server-sdk) — `isAuthorized()` wrappers
- Story brief: `plans/2026-10-25-iam-authorization-path-brief.md` (H4 authorization path)
- Previous H1 snapshot: `plans/2026-10-24-iam-request-chassis-brief.md`
