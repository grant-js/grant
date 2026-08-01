---
title: Permission Evaluation Benchmarks
description: Latency and throughput for POST /api/auth/is-authorized
---

# Permission Evaluation Benchmarks

Summary of **permission evaluation** performance via `POST /api/auth/is-authorized` — the path SDKs and app guards use on every authorized request. Raw dated dumps from `pnpm benchmark:authz` stay local; this page is the committed report.

Dashboard GraphQL list queries are out of scope here; see [Field Selection](/advanced-topics/field-selection) for UI payload shape guidance.

## Environment

| Field              | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| **Date**           | 2026-07-20                                                                |
| **API**            | Local (`http://localhost:4000`)                                           |
| **Scope**          | `accountProject` (CDM-imported project with ~371 permissions, ~272 users) |
| **Endpoint**       | `POST /api/auth/is-authorized`                                            |
| **Runs per check** | 20                                                                        |
| **Throughput**     | 30 cold checks, concurrency 3                                             |

Cold runs vary `context.resource.id` so each call bypasses the AuthHandler result cache and exercises real evaluation. Warm runs reuse a fixed context after a prime request (cache hit).

## Results

| Check                      | mode | p50 (ms) | p95 (ms) | min | max | mean | authorized | reason                            | ok  | Target               |
| -------------------------- | ---- | -------- | -------- | --- | --- | ---- | ---------- | --------------------------------- | --- | -------------------- |
| allow: Project.Query       | cold | 11       | 23       | 10  | 40  | 14   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass (p95 &lt; 50ms) |
| allow: Project.Query       | warm | 4        | 5        | 4   | 9   | 5    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass (p95 &lt; 15ms) |
| allow: Permission.Query    | cold | 9        | 12       | 9   | 13  | 10   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Permission.Query    | warm | 4        | 8        | 4   | 8   | 5    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Role.Query          | cold | 9        | 10       | 9   | 13  | 10   | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| allow: Role.Query          | warm | 4        | 6        | 4   | 8   | 5    | true       | `PERMISSION_GRANTED_NO_CONDITION` | yes | Pass                 |
| deny: unknown resource     | cold | 9        | 13       | 9   | 13  | 9    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: unknown resource     | warm | 4        | 5        | 4   | 9   | 4    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: ungranted CDM action | cold | 10       | 13       | 9   | 17  | 11   | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |
| deny: ungranted CDM action | warm | 4        | 5        | 4   | 8   | 4    | false      | `NO_MATCHING_PERMISSION_FOUND`    | yes | Pass                 |

### Throughput

| Check                       | total | concurrency | wall (ms) | checks/s | p50 | p95 | ok  |
| --------------------------- | ----- | ----------- | --------- | -------- | --- | --- | --- |
| allow: Project.Query (cold) | 30    | 3           | 192       | **156**  | 16  | 34  | yes |

## Targets

- Cold evaluation **p95 &lt; 50ms**
- Warm (cached) **p95 &lt; 15ms**
- Allow/deny outcomes match expectations
- Zero HTTP errors

All checks met these targets on this run.

## Interpretation

### What is being measured

Each call unions permission sources for the caller in scope (role→group, user→group, role→permission, user→permission), matches action + resource, then evaluates conditions when present. See [Architecture Overview → Permission Evaluation](/architecture/overview#permission-evaluation).

| Mode           | Meaning                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| **Cold**       | Cache-busted evaluation — closest to “first check” cost after deploy or for a new resource context  |
| **Warm**       | AuthHandler cache hit — typical repeat check for the same permission + context within the token TTL |
| **Throughput** | Bounded-concurrency cold checks — rough sustained capacity under light parallel load                |

### Allow vs deny

Deny paths (`NO_MATCHING_PERMISSION_FOUND`) are as fast as allow on this dataset — the engine still collects and filters permission IDs; absence of a match is not a cheap short-circuit before that work. That is the right property for security; it also means deny traffic is not “free.”

### Cache effect

Warm p95 (~5–8ms) is roughly **2–4×** faster than cold p95 (~10–23ms). Integrations that re-check the same permission+context benefit from the server-side authorization cache automatically.

### Takeaways

- Permission evaluation stays well under 50ms p95 cold for this project size.
- Cached checks are single-digit milliseconds.
- ~150 cold checks/s at concurrency 3 on a local API is a useful floor for capacity planning (staging/production will differ with hardware and pool size).
- Avoid unbounded parallel fan-out against `is-authorized` from a single client; use modest concurrency (the benchmark defaults to 3).

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

Credentials may include a custom `checks` array (`name`, `permission`, `expectAuthorized`) to override the defaults.

Script: `scripts/benchmarks/permission-evaluation.mjs`. Fresh dated JSON/MD files are written under `docs/benchmarks/` as `authz-{date}.*` (gitignored except this report and the README).

## Related

- [Architecture Overview](/architecture/overview#permission-evaluation) — evaluation diagram
- [RBAC](/architecture/rbac) — permission sources and evaluation steps
- [Data Model](/architecture/data-model) — core authorization EER
- [Client SDK](/integration/client-sdk) / [Server SDK](/integration/server-sdk) — `isAuthorized()` wrappers
