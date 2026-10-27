---
title: Key-fanout CDM replace hash-prep baseline
description: First and replace wall-clock of a key-fanout project-sync import, with hash-prep split out
---

# Key-fanout CDM replace hash-prep baseline

Slice 1 of `plans/2026-10-27-cdm-replace-unchanged-keys-brief.md`. Existing harness family only: `pnpm --filter grant-api measure:cdm-import -- --replace key-fanout`. **No fingerprint / skip-unchanged apply code.** This page does not invent a p50/p95/p99 and does not publish a Lambda-fit SLA.

The merge first+repeat numbers in `docs/benchmarks/cdm-import-key-fanout.md` are a different strategy on a path that hashed **inside** import seconds. They do not stand in for a worker **replace**.

## Environment

| Field         | Value                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**      | 2026-10-27                                                                                                                                                                                            |
| **Apply SHA** | `8bead44a` (`origin/main`, includes [#618](https://github.com/grant-js/grant/pull/618)). This slice logs hash-prep; it does not change create/teardown.                                               |
| **Fixture**   | `generateKeyFanoutCdm()` / profile `key-fanout` — not `enterprise` / `entropy-bound`                                                                                                                  |
| **Command**   | `NODE_ENV=test DB_URL=… TOKEN_BCRYPT_ROUNDS=10 pnpm --filter grant-api measure:cdm-import -- --replace key-fanout`                                                                                    |
| **Datastore** | Disposable PostgreSQL 16 on localhost:5432, migrated and seeded with the e2e scripts. Docker was not available on this Cloud Agent VM, so `pnpm test:e2e:up` could not start; same migrate/seed path. |
| **RLS**       | On (`SET LOCAL` inside the measure transaction, matching the worker)                                                                                                                                  |
| **Hash**      | `TOKEN_BCRYPT_ROUNDS=10`                                                                                                                                                                              |
| **Cache**     | In-process memory (`CacheFactory.createEntityCache({ strategy: 'memory' })`)                                                                                                                          |
| **Host**      | Linux 6.12, 4 CPUs, 16 GiB RAM. Postgres and the Node process share the machine (not Lambda→RDS).                                                                                                     |

`--replace` imports once (merge into an empty project), then imports the same document with `mode.strategy = replace` + `confirmDestructive`. `--repeat` (merge-creates-again) was not used on this run so the two strategies stay distinct.

## One-thread hash-prep

`hashCdmApiKeySecretsSerially` — `hashSecret` / `bcrypt.hashSync`, cost 10, one secret after another. This is the 1-CPU number. Multi-core `Promise.all` (`hashSecretAsync`) is **not** this row.

| Profile      | Secrets |   Hash-prep | ms/secret |
| ------------ | ------: | ----------: | --------: |
| `key-fanout` |   1,124 | **55.80 s** |      49.6 |

## Worker-shaped import (hash-prep then TX then invalidate)

Each pass hashes with `withHashedCdmApiKeySecrets` (async bcrypt, libuv threadpool on 4 CPUs) **before** snapshot+apply, then times `invalidateCachesForImportResult`. Totals include those phases. They exclude queue latency and `markCompleted`.

| Profile      | Entities | Pass    | Secrets | Hash-prep | Snapshot |  Apply | Post-commit |       Total | Applied | vs 15 min |
| ------------ | -------: | ------- | ------: | --------: | -------: | -----: | ----------: | ----------: | ------: | --------: |
| `key-fanout` |      457 | first   |   1,124 |   14.09 s |   0.03 s | 3.65 s |      0.00 s | **17.77 s** |   4,415 |      2.0% |
| `key-fanout` |      457 | replace |   1,124 |   14.04 s |   0.12 s | 3.74 s |      0.00 s | **17.90 s** |   4,393 |      2.0% |

Hash-prep is **79%** of the replace total on this 4-CPU host (14.04 / 17.90). Apply after the hashes exist is **3.74 s**. One-thread hash-prep (**55.80 s**) is **15×** apply.

### SyncProjectResult counters

| Counter                     | First | Replace | Notes                                                     |
| --------------------------- | ----: | ------: | --------------------------------------------------------- |
| `rolesCreated`              |     7 |       7 | Replace teardown + recreate                               |
| `groupsCreated`             |    57 |      57 |                                                           |
| `roleGroupsLinked`          |     0 |       0 | Roles have no group path                                  |
| `groupPermissionsLinked`    |   494 |     494 |                                                           |
| `projectRolesLinked`        |     7 |       7 |                                                           |
| `projectGroupsLinked`       |    57 |      57 |                                                           |
| `projectPermissionsLinked`  |   336 |     336 |                                                           |
| `projectResourcesLinked`    |    46 |      46 |                                                           |
| `projectUsersEnsured`       |    11 |       0 | Users already members; replace does not re-provision them |
| `usersCreated`              |    11 |       0 | Email identities already exist                            |
| `userRolesAssigned`         | 1,883 |   1,883 | Listings, not distinct `(user, role)` pairs               |
| `projectUserApiKeysCreated` | 1,124 |   1,124 | **Replace still creates every key** after teardown        |
| `resourcesCreated`          |    46 |      46 |                                                           |
| `permissionsCreated`        |   336 |     336 |                                                           |
| `tagsCreated`               |     0 |       0 |                                                           |

Password counters stayed 0 (fixture has no password hashes). Tag / role-group counters stayed 0.

Replace applied **4,393** vs first **4,415**: the 22 missing increments are `usersCreated` (11) + `projectUsersEnsured` (11). Keys did **not** shrink — `projectUserApiKeysCreated` is 1,124 on both passes.

## Verdict

**Hash-prep is the remaining minutes on an unchanged replace.** After #618 the apply/TX work for this fixture is a few seconds. The worker still bcrypt-10s every BYOK secret before that TX, and replace still reports 1,124 keys created. On this host:

- 4-CPU async hash-prep: **14.04 s** of a **17.90 s** replace
- 1-thread sync hash-prep: **55.80 s** (49.6 ms/secret × 1,124)

That 1-thread row is the one that maps toward ~0.6–1 vCPU Lambda, not the 14 s `Promise.all`. Diagnosis 2–4 min on a throttled Lambda remains order-of-magnitude; this page does not invent a Lambda-fit SLA or scale 55.80 s by a guessed factor. Slice 2 (fingerprint + skip) is **required** — do not skip it, and do not lower `TOKEN_BCRYPT_ROUNDS`.

Post-commit invalidate was **0.00 s** here (11 members, memory cache). It does not explain a ~40 s Lambda invocation tail; that stays an optional later look.

## What this is not

- Not a p95. One first pass, one replace, one serial hash-prep.
- Not a new Lambda-fit target.
- Not the merge `--repeat` row from `docs/benchmarks/cdm-import-key-fanout.md`.
- Not a cheaper KDF. Rounds stay 10.
