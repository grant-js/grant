---
title: Permission Evaluation Benchmarks
description: Latency and throughput for POST /api/auth/is-authorized
---

# Permission Evaluation Benchmarks

Summary of **permission evaluation** performance via `POST /api/auth/is-authorized` — the path SDKs and app guards use on every authorized request. Raw dated dumps from `pnpm benchmark:authz` stay local; this page is the committed report.

This bench is **H4** (the RBAC walk + AuthHandler result cache). It is **not** a measurement of H1 pool wait. A request that is fast here can still occupy a Postgres client for the whole response; see [How to watch the parking spot](#how-to-watch-the-parking-spot-h1) below.

Dashboard GraphQL list queries are out of scope here; see [Field Selection](/advanced-topics/field-selection) for UI payload shape guidance.

## Environment

| Field              | Value                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**           | 2026-10-24                                                                                                                                         |
| **SHA**            | `f3abf2ef` (`main` / story trunk `feat/iam-request-chassis` at measure time; this docs slice does not change the API)                              |
| **API**            | Local (`http://localhost:4000`), `NODE_ENV=development`                                                                                            |
| **Datastore**      | PostgreSQL 16 and Redis 7 on the host (this VM has no Docker; same ports as Compose)                                                               |
| **Rate limit**     | Off (`SECURITY_ENABLE_RATE_LIMIT=false`). The published 20-run series plus throughput exceeds the production default of 100 requests / 15 minutes. |
| **Scope**          | `accountProject` (fresh personal-account project on the seed permission model)                                                                     |
| **Catalog size**   | 68 permissions, 2 users (system + bench). **Not** the 2026-07-20 CDM-imported project (~371 permissions, ~272 users).                              |
| **Endpoint**       | `POST /api/auth/is-authorized`                                                                                                                     |
| **Runs per check** | 20                                                                                                                                                 |
| **Throughput**     | 30 cold checks, concurrency 3                                                                                                                      |
| **Host**           | Linux 6.12, 4 CPUs, 16 GiB RAM                                                                                                                     |

Cold runs vary `context.resource.id` so each call bypasses the AuthHandler result cache and exercises real evaluation. Warm runs reuse a fixed context after a prime request (cache hit).

A first attempt on this host with the example `.env` (`NODE_ENV=production`, rate limit on) returned `rate_limit_exceeded` from Role.Query onward. Those rows were discarded. The table below is the second run, after rate limit was turned off.

## Results

| Check                      | mode | p50 (ms) | p95 (ms) | min | max | mean | authorized | reason                            | ok  | Target               |
| -------------------------- | ---- | -------- | -------- | --- | --- | ---- | ---------- | --------------------------------- | --- | -------------------- |
| allow: Project.Query       | cold | 12       | 32       | 8   | 39  | 16   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass (p95 &lt; 50ms) |
| allow: Project.Query       | warm | 5        | 8        | 5   | 8   | 6    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass (p95 &lt; 15ms) |
| allow: Permission.Query    | cold | 9        | 20       | 8   | 25  | 11   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Permission.Query    | warm | 5        | 8        | 5   | 9   | 6    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Role.Query          | cold | 10       | 13       | 8   | 13  | 10   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Role.Query          | warm | 5        | 8        | 5   | 8   | 6    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| deny: unknown resource     | cold | 10       | 20       | 7   | 28  | 11   | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: unknown resource     | warm | 5        | 7        | 5   | 8   | 6    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: ungranted CDM action | cold | 9        | 10       | 7   | 10  | 8    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: ungranted CDM action | warm | 5        | 7        | 5   | 7   | 5    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |

### Throughput

| Check                       | total | concurrency | wall (ms) | checks/s | p50 | p95 | ok  |
| --------------------------- | ----- | ----------- | --------- | -------- | --- | --- | --- |
| allow: Project.Query (cold) | 30    | 3           | 205       | **146**  | 19  | 28  | yes |

## Targets

Published targets are unchanged. This story does **not** invent H1 (pool-hold) p95 targets.

- Cold evaluation **p95 &lt; 50ms**
- Warm (cached) **p95 &lt; 15ms**
- Allow/deny outcomes match expectations
- Zero HTTP errors

All checks met these targets on this run.

## Previous snapshot (2026-07-20)

Last committed numbers before this re-run, against a CDM-imported `accountProject` (~371 permissions, ~272 users) on local `http://localhost:4000`. Kept so the catalog-size difference is visible. Cold Project.Query p95 was 23 ms; warm 5 ms; throughput 156 checks/s.

## Interpretation

### What is being measured

Each call unions permission sources for the caller in scope (role→group, user→group, role→permission, user→permission), matches action + resource, then evaluates conditions when present. See [Architecture Overview → Permission Evaluation](/architecture/overview#permission-evaluation).

| Mode           | Meaning                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| **Cold**       | Cache-busted evaluation — closest to “first check” cost after deploy or for a new resource context  |
| **Warm**       | AuthHandler cache hit — typical repeat check for the same permission + context within the token TTL |
| **Throughput** | Bounded-concurrency cold checks — rough sustained capacity under light parallel load                |

This is the H1 **before-picture** for permission-check latency only. It does not prove the request transaction client is back in the pool.

### Allow vs deny

Deny paths (`NO_MATCHING_PERMISSION_FOUND`) are in the same band as allow on this seed catalog — the engine still collects and filters permission IDs; absence of a match is not a cheap short-circuit before that work. That is the right property for security; it also means deny traffic is not “free.”

### Cache effect

Warm p95 (7–8 ms) is roughly **2–4×** faster than cold p95 (10–32 ms). Integrations that re-check the same permission+context benefit from the server-side authorization cache automatically.

### Takeaways

- Permission evaluation stays under 50 ms p95 cold on this seed-sized project.
- Cached checks are single-digit milliseconds.
- ~150 cold checks/s at concurrency 3 on a local API is a useful floor for capacity planning (staging/production will differ with hardware, catalog size, and pool size).
- Avoid unbounded parallel fan-out against `is-authorized` from a single client; use modest concurrency (the benchmark defaults to 3).
- A production-shaped global rate limit (100 / 15 min) cannot finish this published series. Turn rate limit off, or raise `SECURITY_RATE_LIMIT_MAX`, for a local re-run.

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
- Story brief: `plans/2026-10-24-iam-request-chassis-brief.md` (H1 request-chassis)
