---
title: Key-fanout CDM import baseline
description: First and repeat wall-clock of a key-fanout project-sync import on current main
---

# Key-fanout CDM import baseline

Slice 1 of `plans/2026-10-27-cdm-import-batch-apply-brief.md`. Existing harness only: `pnpm --filter grant-api measure:cdm-import -- --repeat key-fanout`. **No production apply code changed.** This page does not invent a p50/p95/p99 and does not publish a Lambda-fit SLA.

The diagnosis (`plans/2026-10-27-cdm-import-performance-diagnosis.md`) remains order-of-magnitude for Lambda→RDS (~11 min first import). The numbers below are this host.

## Environment

| Field         | Value                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**      | 2026-10-27                                                                                                                                                                                            |
| **Apply SHA** | `588183f9` (`origin/main`; this slice does not change apply)                                                                                                                                          |
| **Fixture**   | `generateKeyFanoutCdm()` / profile `key-fanout` — not `enterprise` / `entropy-bound`                                                                                                                  |
| **Command**   | `NODE_ENV=test DB_URL=… pnpm --filter grant-api measure:cdm-import -- --repeat key-fanout`                                                                                                            |
| **Datastore** | Disposable PostgreSQL 16 on localhost:5432, migrated and seeded with the e2e scripts. Docker was not available on this Cloud Agent VM, so `pnpm test:e2e:up` could not start; same migrate/seed path. |
| **RLS**       | On (`SET LOCAL` inside the measure transaction, matching the worker)                                                                                                                                  |
| **Hash**      | `TOKEN_BCRYPT_ROUNDS=10`                                                                                                                                                                              |
| **Cache**     | In-process memory (`CacheFactory.createEntityCache({ strategy: 'memory' })`)                                                                                                                          |
| **Host**      | Linux 6.12, 4 CPUs, 16 GiB RAM. Postgres and the Node process share the machine (not Lambda→RDS).                                                                                                     |

`clientId` is omitted on the fixture keys. A first attempt that set `clientId` finished the first pass and then failed the merge-repeat with `ConflictError: clientId is already in use for this scope` — merge always creates new key rows, and scoped uniqueness stays fail-closed. BYOK cost is the secret hash + insert.

## Results

| Profile      | Entities | Pass   | Snapshot |  Import |       Total | Applied | ms/entity | vs 15 min |
| ------------ | -------: | ------ | -------: | ------: | ----------: | ------: | --------: | --------: |
| `key-fanout` |      457 | first  |   0.02 s | 65.72 s | **65.73 s** |   4,415 |     143.8 |      7.3% |
| `key-fanout` |      457 | repeat |   0.04 s | 65.26 s | **65.30 s** |   4,393 |     142.9 |      7.3% |

Durations are snapshot + import inside one transaction, matching `project-sync.job.ts`. They exclude queue latency and the job-row writes that bracket them. The existing tool's "vs 15 min" column is the Lambda ceiling the harness already prints — not a new target from this slice.

### SyncProjectResult counters

| Counter                     | First | Repeat | Notes                                       |
| --------------------------- | ----: | -----: | ------------------------------------------- |
| `rolesCreated`              |     7 |      7 | Merge creates again                         |
| `groupsCreated`             |    57 |     57 |                                             |
| `roleGroupsLinked`          |     0 |      0 | Roles have no group path                    |
| `groupPermissionsLinked`    |   494 |    494 |                                             |
| `projectRolesLinked`        |     7 |      7 |                                             |
| `projectGroupsLinked`       |    57 |     57 |                                             |
| `projectPermissionsLinked`  |   336 |    336 |                                             |
| `projectResourcesLinked`    |    46 |     46 |                                             |
| `projectUsersEnsured`       |    11 |      0 | Repeat: already members                     |
| `usersCreated`              |    11 |      0 | Repeat: email identities already exist      |
| `userRolesAssigned`         | 1,883 |  1,883 | Listings, not distinct `(user, role)` pairs |
| `projectUserApiKeysCreated` | 1,124 |  1,124 |                                             |
| `resourcesCreated`          |    46 |     46 |                                             |
| `permissionsCreated`        |   336 |    336 |                                             |
| `tagsCreated`               |     0 |      0 |                                             |

Password counters stayed 0. Tag / role-group counters stayed 0.

Repeat applied **4,393** vs first **4,415**: the 22 missing increments are `usersCreated` (11) + `projectUsersEnsured` (11).

## Statement / hot-function sketch

`pg_stat_statements` over **both** passes (reset immediately before the command):

|                         | Value    |
| ----------------------- | -------- |
| **SQL calls**           | 59,047   |
| **Distinct queries**    | 138      |
| **SQL exec time**       | 1.87 s   |
| **Wall (first+repeat)** | 131.03 s |

About **29.5k statements per pass**, in the diagnosis's 20k–30k band. SQL was **~1.4%** of wall clock on this host. The rest is process time (bcrypt-10 `hashSync` on 1,124 secrets per pass, plus sequential `await` on the service loop).

Hottest statements by total exec time (both passes):

| Calls |  Total |    Mean | Shape                                                             |
| ----: | -----: | ------: | ----------------------------------------------------------------- |
| 1,724 | 732 ms | 0.42 ms | `SELECT` all `project_permissions` for the project (list-all N+1) |
| 2,248 | 157 ms | 0.07 ms | `INSERT api_keys`                                                 |
| 2,248 | 147 ms | 0.07 ms | `INSERT project_user_api_keys`                                    |
| 2,248 | 121 ms | 0.05 ms | `INSERT api_key_audit_logs`                                       |
| 2,248 |  93 ms | 0.04 ms | `INSERT project_user_api_key_audit_logs`                          |
| 3,766 |  37 ms | 0.01 ms | `SELECT user_roles` by `user_id` (`addUserRole` full list)        |
| 3,934 |  24 ms | 0.01 ms | `SELECT roles` by id                                              |
|   988 |  39 ms | 0.04 ms | `INSERT group_permissions`                                        |

2,248 key inserts = 1,124 × two passes. User-role listing volume sits in the `user_roles` / `roles` selects (thousands of calls against 7 templates × 11 users).

On this host the **repeat snapshot stayed cheap** (0.04 s). That does **not** calibrate Lambda→RDS export of the same graph; it is the local number.

## What this is not

- Not a p95. One first pass, one repeat.
- Not a new Lambda-fit target. Do not scale 65.73 s by a guessed RDS RTT factor.
- Not the ADR 0002 28,880-entity / 62.3 min row (inverse shape: many users, few keys).
- Not a reason to skip slice 2. The sequential service loop and bcrypt-in-TX are still the apply path; this slice only wrote the key-fanout before-picture.

## After slices 2 and 3 (batch pivots + batch keys)

Same harness, same fixture, same host, same disposable PostgreSQL 16. Apply SHA `e99635c9` on `feat/cdm-import-batch-apply-keys` ([#617](https://github.com/grant-js/grant/pull/617), stacked on [#615](https://github.com/grant-js/grant/pull/615)). Command: `NODE_ENV=test DB_URL=… pnpm --filter grant-api measure:cdm-import -- --repeat key-fanout`. `pg_stat_statements` reset immediately before the command. **No p50/p95/p99. No Lambda-fit SLA.**

The measure tool calls `importProjectCdm` inside the snapshot+import transaction **without** `withHashedCdmApiKeySecrets`. Hashing 1,124 secrets at bcrypt-10 is therefore inside **import seconds** (async `hashSecretAsync`, parallel on this host). The worker hashes before `withTransaction`; worker import seconds would exclude that CPU.

| Profile      | Entities | Pass   | Snapshot |  Import |       Total | Applied | ms/entity | vs 15 min | vs slice 1 |
| ------------ | -------: | ------ | -------: | ------: | ----------: | ------: | --------: | --------: | ---------: |
| `key-fanout` |      457 | first  |   0.05 s | 17.30 s | **17.35 s** |   4,415 |      38.0 |      1.9% |     −73.6% |
| `key-fanout` |      457 | repeat |   0.04 s | 17.16 s | **17.20 s** |   4,393 |      37.6 |      1.9% |     −73.7% |

| Field                | Slice 1 (`588183f9`) | After 2+3 (`e99635c9`) |
| -------------------- | -------------------: | ---------------------: |
| First total          |              65.73 s |                17.35 s |
| Repeat total         |              65.30 s |                17.20 s |
| First snapshot       |               0.02 s |                 0.05 s |
| Repeat snapshot      |               0.04 s |                 0.04 s |
| SQL calls (both)     |               59,047 |                 20,438 |
| Distinct queries     |                  138 |                    143 |
| SQL exec time (both) |               1.87 s |                 0.81 s |
| Wall first+repeat    |             131.03 s |                34.55 s |

Counters match slice 1: 7 roles, 57 groups, 494 group-permission links, 1,124 keys, 1,883 role listings, 11 users on first (`usersCreated` / `projectUsersEnsured` 0 on repeat). Repeat applied **4,393** vs first **4,415** — the same 22-increment gap. Password / tag / role-group counters stayed 0.

SQL is **~2.3%** of the 34.55 s wall (was ~1.4% of 131 s). About **10.2k statements per pass**, down from ~29.5k.

Hottest statements by total exec time (both passes):

| Calls |  Total |    Mean | Shape                                                             |
| ----: | -----: | ------: | ----------------------------------------------------------------- |
|   674 | 216 ms | 0.32 ms | `SELECT` all `project_permissions` for the project (list-all)     |
| 2,248 |  56 ms | 0.02 ms | `INSERT api_key_audit_logs`                                       |
| 2,248 |  48 ms | 0.02 ms | `INSERT project_user_api_key_audit_logs`                          |
|     2 |  45 ms | 22.6 ms | `INSERT project_user_api_keys` (multi-row; 1,124 rows × 2 passes) |
|   672 |  38 ms | 0.06 ms | `INSERT permissions`                                              |
|     2 |  33 ms | 16.7 ms | `INSERT api_keys` (multi-row; 1,124 rows × 2 passes)              |

Slice 1's 2,248 single-row `INSERT api_keys` / `INSERT project_user_api_keys` are now **two** multi-row inserts. `INSERT user_roles` is two multi-row statements. `INSERT group_permissions` dropped from 988 calls to 114 batched inserts. The 3,766 `SELECT user_roles` / 3,934 `SELECT roles` shapes left the hot list.

Repeat is **apply again**, not snapshot: snapshot stayed **0.04–0.05 s**; repeat import **17.16 s** vs first **17.30 s**. Merge still creates 7 roles, 57 groups, and 1,124 keys. That is the stack plan's skip rule for slice 4 — snapshot is not the remaining minutes.

### Skip slice 4

**Skip `feat/cdm-import-batch-apply-snapshot`.** First+repeat are a significant cut vs slice 1 (65.73 s / 65.30 s → 17.35 s / 17.20 s) and the repeat is explained by merge-creates-again plus bcrypt-10 of 1,124 secrets in the measure's import seconds. Snapshot is tens of milliseconds on this host, not minutes. Do not invent a Lambda export cost from this local snapshot.

Remaining apply time on this host is process time (hashing in the measure path, leftover sequential permission/project-permission writes). Cheaper KDF is **out of this stack**. This page still does not publish a Lambda-fit SLA.
