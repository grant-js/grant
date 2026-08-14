# Code quality: `packages/@grantjs/database`

**Pass 4** · 2026-08-10 · commit `a566198a` · ~9,100 lines (6,342 TypeScript in `src/` + 2,772 SQL across 79 migrations)

Method and lens definitions: [Code quality passes](./README.md). Prior passes: 1 = [`apps/api`](./api.md), 2 = [`apps/web`](./web.md), 3 = [`@grantjs/core`](./core.md).

**Status: remediated and merged** — [#256](https://github.com/grant-js/grant/pull/256), 2026-08-14, five slices, 20 files, +1,697 −61, **zero schema, column, or migration changes**. This document is the audit as written on 2026-08-10; findings resolved by the story are marked **Resolved** in place, with the counts re-measured after the merge rather than copied from the plan. What remains open is in [Backlog](#backlog).

|                               | At audit          | After #256             |
| ----------------------------- | ----------------- | ---------------------- |
| Test files / tests            | **0** / 0         | 5 / **89**             |
| `drizzle-kit` configs         | 2, non-equivalent | 1                      |
| `knip` unused dependencies    | 1 (`zod`)         | 0                      |
| Packages with a DAG guardrail | 1 (`core`)        | 2 (`core`, `database`) |
| `dead-code:*` gates in CI     | 3                 | 4                      |

**Process note — this pass was run differently.** Passes 2 and 3 fanned the lenses out across three subagents. That fan-out was attempted here and **all three agents terminated early on a session limit**, so lenses 1–6 were re-run inline by the orchestrator and only lens 7's partial output survived (a working test harness plus 46 passing tests — see [Tier 6](#tier-6-coverage)). Recorded because it is a reusable operational lesson, not a one-off: fan-out is a throughput optimization, not a correctness requirement, and a pass that loses its agents should fall back to running the lenses directly rather than stalling. See [What this pass's method surfaced](#what-this-passs-method-surfaced).

**Scoping correction, made mid-pass.** The unit was initially measured at 6,342 lines by counting `.ts` files only. `src/migrations/` holds **79 SQL files totalling 2,772 lines** — a third of the package, invisible to a TypeScript-only count and not covered by any lens command written for prior passes. The lens agents were briefed with the understated figure. Corrected here; the real unit is ~9,100 lines.

## Summary

**This is the most internally consistent unit audited so far, and the numbers only show it after correcting for principled exceptions.** A raw count reads as 50% drift — 111 `createdAt` columns against 57 `updatedAt`. Per-table analysis shows the opposite: of 110 tables, 53 are append-only `*_audit_logs`/`event_log` tables that _correctly_ omit `updatedAt` and `deletedAt`, and once those are excluded, **0 tables are missing `updatedAt`, 0 are missing `createdAt`**, and only 3 lack `deletedAt`. Soft delete is 100% single-style (`deletedAt`, zero boolean variants). **All 166 foreign keys declare an `onDelete` behavior** — zero unset, which is the single most common data-integrity gap in a schema this size and it simply isn't present here.

**The vocabulary holds at the physical layer, which is where it is hardest to change.** `CONCEPTS.md`'s claim that no `tenantId` exists anywhere is **confirmed** for this package (0 occurrences; the discriminator column is `scopeTenant`, 113 uses). Zero `orgId` abbreviations against 29 `organizationId`. The one documented divergence that _does_ reach physical storage is the `member`/`user` fork — the table is `organization_users` ([`organization-users.schema.ts:17`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/src/schemas/organization-users.schema.ts)) while GraphQL and REST both say _member_. That was already recorded by pass 1 and tagged **contract**; this pass adds the physical-table citation, which raises the cost of ever reconciling it from "a rename" to "a migration."

**What drifted is concentrated in two places, neither of them the schema.** The largest repetition block in the package is the 53 audit-log tables — two of them diff to **0 lines** after normalizing the entity name (18 lines each, ~950 lines total). And there are **two drizzle configs whose database-URL resolution is not equivalent**, sitting on `db:migrate`, a destructive operation.

**No Tier 0 correctness bug was confirmed.** Lens 7 is the lens that has produced one in every prior pass, and it was the lens most disrupted by the agent failures — its work here is genuinely partial. The absence of a Tier 0 finding in this document should be read as _"not yet found"_, not _"not present"_; see [Tier 6](#tier-6-coverage) for exactly which surfaces remain uncharacterized.

> **Update after #256: still no Tier 0, and the caveat is now retired for everything but the migration SQL.** Slice 3 finished the lens — 89 tests across all five files — and found no correctness bug, but did pin five behaviors worth changing later ([Backlog](#backlog)). Separately, a Tier 0 fail-open **was** filed during the pass and then **withdrawn**: see [the permission-condition collision](#the-permission-condition-collision).

| Lens                                                      | Result                                                                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Reverse-DAG / boundary violations from `apps/web`         | 0                                                                                                                                  |
| Direct `@grantjs/logger` import (the rule adapters break) | 0                                                                                                                                  |
| Deep relative imports (3+ levels)                         | 0                                                                                                                                  |
| `connection.ts` env reads                                 | 0 — pure config injection via `DatabaseConfig`                                                                                     |
| Tables                                                    | 110 (53 append-only audit/event tables, 57 entity/pivot tables)                                                                    |
| Soft-delete representation                                | 1 style (`deletedAt`); 0 boolean `isDeleted` variants                                                                              |
| Tables missing `createdAt`                                | 0 / 110                                                                                                                            |
| Non-audit tables missing `updatedAt`                      | **0** (raw count of 57 vs 111 is entirely explained by append-only tables)                                                         |
| Non-audit tables missing `deletedAt`                      | 3 (`notifications`, `notification_preferences`, `webhook_delivery_attempts`)                                                       |
| Foreign keys declaring `onDelete`                         | **166 / 166** (110 `cascade`, 56 `set null`) — zero unset                                                                          |
| `tenantId` columns                                        | 0 — `CONCEPTS.md`'s claim confirmed; discriminator is `scopeTenant` (113 uses)                                                     |
| `orgId` abbreviations                                     | 0 (vs 29 `organizationId`)                                                                                                         |
| Audit-log table repetition                                | 53 tables × 18 lines; two instances diff to **0 lines** entity-normalized                                                          |
| `drizzle-kit` configs                                     | **2**, with non-equivalent URL resolution — now 1 ([3.1](#31-two-drizzle-kit-configs-with-non-equivalent-database-url-resolution)) |
| `knip` unused dependencies                                | 1 (`zod`) — now 0                                                                                                                  |
| Test files (before this pass)                             | **0** — now 5 files / 89 tests ([Tier 6](#tier-6-coverage))                                                                        |

---

## Tier 1 — Guardrail gaps {#tier-1-guardrail-gaps}

### Guardrails reach `@grantjs/core` and stop there — **Resolved** (slice 1)

> `eslint.config.mjs` now carries a `packages/@grantjs/database/src/**` DAG block, `package.json` a `dead-code:database` script, and both CI and `.husky/pre-push` run it. **Proved by planting** a `@grantjs/logger` import in `src/index.ts` and confirming the rule errored, per pass 3's corollary. The rule's allowed set is deliberately wider than core's — copying core's verbatim broke the build, because `database` really does depend on `@grantjs/env` and `@grantjs/constants`. `zod` was dropped from `dependencies`.

Carried forward from pass 3's ["Inputs carried into later passes"](./README.md#inputs-carried-into-later-passes) entry, confirmed still true. `eslint.config.mjs:359`'s `no-restricted-imports` DAG rule names `packages/@grantjs/core/src/**` explicitly; `package.json` has `dead-code:core` but no `dead-code:database`. Pass 3 deliberately scoped its rule to itself and wrote the widening as this pass's first slice — that is the template to copy, including **planting a violation to prove the new rule fires** rather than trusting a green run.

Unlike core, there is a real (if small) finding behind this guardrail: `knip` reports `zod` as an unused dependency ([`package.json:36`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/package.json)), which nothing currently catches.

### `AGENTS.md`'s package dependency graph omits a package this unit depends on — **Resolved** (slice 5)

> The graph now shows `@grantjs/env` as a root and annotates `database → also @grantjs/env, @grantjs/constants`, with a note that its allowed import set is intentionally wider than core's.

[`AGENTS.md`](https://github.com/grant-js/grant/blob/main/AGENTS.md) documents the DAG as `@grantjs/schema → @grantjs/core → {constants, database, logger, errors, cache, storage, email, jobs}`. Two edges this package actually has are absent from it:

| Edge                            | Evidence                                                                                                                                                                                   | In the documented graph?                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `database → @grantjs/env`       | Declared in `package.json` `dependencies`; used in 4 files (`grant-rls-login-role.lib.ts:5-6`, `scripts/seed-system-user.ts:3`, `scripts/reset-db.ts:3`, `scripts/seed-permissions.ts:13`) | **No** — `@grantjs/env` appears nowhere in the graph                          |
| `database → @grantjs/constants` | Declared in `package.json`; used in `scripts/seed-permissions.ts:12` and `schemas/resources.schema.ts:1` (`DEFAULT_RESOURCE_ACTIONS`)                                                      | **No** — shown as a _sibling_ of `database` under `core`, not as a dependency |

`@grantjs/database` is the **only** package in the documented graph that depends on `@grantjs/env` (checked across `cache`, `storage`, `email`, `jobs`, `logger`, `errors`, `core`, `constants`, `schema`). Both are doc corrections, not code changes — the code is fine, the graph is incomplete. Same shape as pass 3's `IStorageAdapter`/`IEmailAdapter` finding: the doc is the stale side.

---

## Tier 2 — Abstraction opportunities {#tier-2-abstraction-opportunities}

### 2.1 The 53 audit-log tables are byte-identical entity-normalized — but the extraction has a real risk to test first

Every entity table has a parallel `*_audit_logs` table. Diffing `roleAuditLogs` ([`roles.schema.ts`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/src/schemas/roles.schema.ts)) against `permissionAuditLogs` ([`permissions.schema.ts`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/src/schemas/permissions.schema.ts)) with the entity name substituted out: **18 lines each, 0 differing lines**. Across 53 tables that is ~950 lines of definition that varies only by entity name.

**Do not treat this as a mechanical win — rule 3 ("mechanical is a claim to test") applies with unusual force here.** A `makeAuditLogTable(entity)` factory is trivial to write in TypeScript, but `drizzle-kit` generates migrations by **statically analyzing schema files**. A dynamically-constructed table may or may not be visible to that analysis, and the failure mode is severe: silently generating no migration, or generating a destructive one. Before proposing this extraction, the _only_ evidence that matters is running `pnpm --filter @grantjs/database db:generate` against a factory-built table and confirming the emitted SQL is identical to today's. That is a spike, not a refactor.

Second consideration, independent of whether it works: a schema file is documentation. Collapsing 18 explicit column declarations behind a factory call makes the audit table's shape invisible at its definition site. That is a legitimate reason to decline even if `drizzle-kit` cooperates — the same judgment that made pass 2 decline its store-factory (`web.md` slice 6) and pass 3 decline the `I*TagRepository` generic. **Recorded as a sized candidate with a named risk, not as recommended work.**

---

## Tier 3 — Divergent styles {#tier-3-divergent-styles}

### 3.1 Two `drizzle-kit` configs with non-equivalent database-URL resolution

| File                                                                                                              | URL resolution                 |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| [`drizzle.config.ts`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/drizzle.config.ts)   | `resolveDatabaseUrl(getEnv())` |
| [`drizzle.config.cjs`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/drizzle.config.cjs) | `process.env.DB_URL`           |

These are **not** equivalent. [`@grantjs/env`'s `resolveDatabaseUrl`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/env/src/index.ts) is:

```ts
if (env.DB_URL) return env.DB_URL;
return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;
```

It composes a URL from `POSTGRES_*` parts when `DB_URL` is unset — a supported configuration. The `.cjs` config has no such fallback and would yield `url: undefined` in exactly that environment. The `db:generate` and `db:migrate` scripts invoke bare `drizzle-kit`, which resolves its config **by file-name convention**, so which of the two wins is decided by the tool, not by the repo.

**Evidence it is probably vestigial:** `package.json`'s `files` array names only `drizzle.config.ts`, so the `.cjs` is not published; nothing in the repo references it; it dates to PR #20 ("Feat/deployment config"). **Evidence not to dismiss it on that basis:** a config file is _auto-discovered_, not imported — "zero references" is far weaker evidence of deadness here than for a module, and this is precisely `knip`'s documented blind spot (it reads module exports; it will never see tool-convention discovery). Pass 1 was bitten by the same class of blind spot with `pino-pretty`.

**Disposition:** delete it, or — if a JS-only runtime context genuinely needs it — have it delegate to `resolveDatabaseUrl` instead of duplicating a weaker version. Either way the divergence should not survive, because it sits on a destructive operation.

> **Resolved (slice 4): deleted.** The blind-spot caveat above was the right call to make, and the answer came from reading drizzle-kit 0.31.10's own resolver rather than from "nothing references it": **`.cjs` is not a candidate extension at any position, and `.ts` is checked first regardless.** The file was unreachable, not merely unreferenced. Confirmed empirically — `drizzle-kit generate` prints `No config path provided, using default 'drizzle.config.ts'`, with **79 migrations before and after**.
>
> The runtime migrator was checked separately, because a config file that drizzle-_kit_ ignores could still be read by something on the startup path. It is not: `drizzle-orm/postgres-js/migrator.js` reads no config file at all — `readMigrationFiles` only does `fs` reads under `config.migrationsFolder`. There is no `umzug` in `src/` or in the lockfile. `drizzle.config.*` is drizzle-kit-only.

### 3.2 Config injection vs. env fallback — two patterns inside one package

[`connection/connection.ts`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/src/connection/connection.ts) is exemplary: `DatabaseConfig` carries `connectionString` and an optional `ILogger`, and the file reads **zero** environment variables — exactly what `AGENTS.md` requires ("Adapter packages receive config via constructor/factory params — they never read env vars directly").

[`grant-rls-login-role.lib.ts:41`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/src/grant-rls-login-role.lib.ts) uses a different shape: `const env = options.env ?? getEnv()` — injection _with an env fallback_. This is defensible (the caller can always override, and the fallback is a convenience) and it is not a rule violation, but it is a second pattern for one concern, in a `.lib.ts` rather than a script. The four `getEnv()` call sites in `scripts/` are **not** in question — a CLI script is its own composition root and reading env there is correct.

**Decide, don't assume:** either the fallback is the intended convenience for lib-level helpers (record it), or lib code should take config strictly and let scripts resolve env (change one call site). Cheap either way.

> **Resolved (slice 5): recorded, no code change** — see [Env fallback in libs](#recorded-decisions).

### 3.3 Three non-audit tables opt out of soft delete

`notifications`, `notification_preferences`, and `webhook_delivery_attempts` are the only non-append-only tables without a `deletedAt`. All three are plausibly intentional — high-volume rows subject to retention/pruning rather than user-facing soft delete. **Worth a recorded decision rather than a change**: if `notifications` is hard-deleted while every other user-facing entity is soft-deleted, that is a deliberate retention policy that should be written down, not an accident to discover during an incident.

> **Resolved (slice 5): recorded, no column added** — see [Three tables without `deletedAt`](#recorded-decisions).

---

## Tier 4 — Dead surface {#tier-4-dead-surface}

`knip --workspace packages/@grantjs/database` runs clean and reports exactly one item: **`zod` is an unused dependency** ([`package.json:36`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/package.json)). Verified independently — `zod` appears in no `src/` import.

> **Resolved (slices 1–2): `zod` removed; the workspace now reports 0.** Slice 2 also had to teach `knip` about the tests it was adding — `knip.json` names `src/**/*.test.ts` and `src/test-support/**` as entry points, because vitest discovers them by glob and `knip` cannot follow a glob. Left implicit, the coverage lens's own output would have been reported as dead files by the dead-surface lens.

**State the tool's blind spots next to its output** (rule 5). For this package `knip` cannot see: the `drizzle.config.cjs` discovery path ([3.1](#31-two-drizzle-kit-configs-with-non-equivalent-database-url-resolution)); table definitions referenced only through Drizzle relations resolved at runtime; and anything named only inside the 2,772 lines of raw SQL in `src/migrations/`. A "0 dead tables" conclusion is **not** supported by this tool run and is not claimed here — see [Backlog](#backlog).

---

## Tier 5 — Ubiquitous language {#tier-5-ubiquitous-language}

### The `member`/`user` fork reaches physical storage

[`CONCEPTS.md`](https://github.com/grant-js/grant/blob/main/CONCEPTS.md) already records this divergence, tagged **contract**, with citations from `apps/api` (pass 1) and `@grantjs/core`'s ports (pass 3). This pass adds the deepest citation: the physical table is **`organization_users`** ([`organization-users.schema.ts:17`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/database/src/schemas/organization-users.schema.ts)), with an `organization_id` column, while GraphQL and REST both expose _member_.

`CONCEPTS.md`'s existing **canonical: `member`** decision is unchanged. The new information is the **cost**: with the fork now cited at the port layer (pass 3) _and_ the table layer (this pass), reconciling it is a database migration plus a contract change, not a rename. That is worth stating explicitly in `CONCEPTS.md` so the next person to propose it knows the true scope. **No rename this pass** — Tier 5 is glossary-first, and a column rename is strictly more dangerous than a code rename.

### What holds

| `CONCEPTS.md` claim                                   | Verified in this package                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| No `tenantId` exists anywhere                         | **Confirmed** — 0 occurrences. The discriminator column is `scopeTenant` (113 uses) |
| `organization`, not `org`                             | **Confirmed** — 0 `orgId`/`org_id`, 29 `organizationId`                             |
| `Tenant` is a scope-kind discriminator, not an entity | **Confirmed** — surfaces as `scopeTenant`, never as an entity reference or FK       |

> **Methodology note, recorded because it nearly produced a false finding.** An initial `rg "tenantId|tenant_id"` returned **52 matches**, appearing to contradict `CONCEPTS.md` outright. Every match was an index _name_ — `..._scope_tenant_idx` contains the substring `tenant_id`. A second grep with word boundaries returned 0. Similarly, an initial `pgTable\(\s*'organization_users?'` returned 0 because the table name sits on the line _after_ the `pgTable(` call. Both are rule-1 corollary failures ("verify the tool ran at all") in the opposite direction from the usual one: not a checker that silently finds nothing, but a checker that confidently finds the wrong thing. Neither claim was filed.

---

## Tier 6 — Coverage {#tier-6-coverage}

### Before this pass: zero test files in a package everything depends on

`packages/@grantjs/database` had **no test files, no test script, and no vitest config**. Unlike `@grantjs/core` — where 5,218 of the lines were pure interface declarations that legitimately need no tests — the untested surface here includes real branching logic on security- and operations-critical paths.

### Landed in-pass (partial — the lens-7 agent did not finish)

A test harness plus 46 passing tests across 2 files, all currently **uncommitted** in the working tree:

| Path                                   | What                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.config.ts`                     | New harness — `@` alias for `src/`, excludes `src/migrations/**`, with a comment recording that Drizzle table definitions are declarative and have no branches to cover |
| `src/test-support/fake-db.ts`          | In-memory fake DB so seed/RLS logic is testable with **no live Postgres**                                                                                               |
| `src/grant-rls-login-role.lib.test.ts` | Characterization of the RLS login-role logic — the highest-risk file in the package                                                                                     |
| `src/scripts/seed-permissions.test.ts` | Characterization of the permission seed                                                                                                                                 |
| `package.json`                         | Adds `test` / `test:coverage` scripts and the `vitest` devDependency                                                                                                    |

Verified by re-running after recovering the work: **46/46 passing**. Adding the harness is a legitimate in-pass fix on the same precedent as pass 2's `vitest.config.ts` JSX fix — it unblocks all future testing of this package and was a prerequisite for the lens, not scope creep.

> **One of those 46 was vacuous, and slices 2–3 found it.** A `group_permissions` assertion filtered an array (always an array) on `values.id`, a field a recorded insert does not carry — it could not fail, and it pinned nothing. Rewritten to assert the group, the permission row, and exactly one link. The generalized rule is now carried forward in the rubric: **mutate the code and confirm the test goes red before counting it.** A second instance of the same class turned up in the same file — `vi.spyOn` on an already-spied method returns the existing spy, so without `vi.clearAllMocks()` the warning assertions were reading 150 accumulated calls where 6 were expected.

One hypothesis was tested and **cleanly refuted**: a scratch probe checked `PERMISSION_MAPPINGS` for duplicate `(resource, action)` pairs within a group — **180 pairs, 0 intra-group duplicates**. Recorded so a future pass does not re-investigate. (The scratch file itself, `probe.tmp.ts`, must be deleted before any of this is committed.)

### Not reached at audit time — **closed by slice 3**

The lens that has produced a Tier 0 finding in **every** prior pass is the one that got cut short here. It was completed as its own slice rather than left owed to a later pass. Final state, 89 tests across 5 files:

| Surface                       | Tests | What the characterization pinned                                                                                                                                                                                                                                                         |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grant-rls-login-role.lib.ts` | 28    | The RLS login-role logic — the highest-risk file in the package. Reviewed independently by Security, per the plan's one load-bearing fan-out                                                                                                                                             |
| `scripts/seed-permissions.ts` | 22    | The permission seed, plus the new conflicting-condition warning ([below](#the-permission-condition-collision))                                                                                                                                                                           |
| `connection/connection.ts`    | 17    | Re-init with a **different** connection string is ignored; `moduleLogger` is assigned before the guard; a failed `closeDatabase()` leaves the singleton populated; `getDatabase()`'s error names a non-existent `initializeDatabase()` and throws bare `Error`, not `ConfigurationError` |
| `bootstrap.ts`                | 13    | Advisory lock and unlock are **two independent pool statements**; the RLS grant is called with no arguments (env fallback); a failed unlock masks the original error; demo-refresh truncate+reseed is not in a transaction                                                               |
| `seed-core.ts`                | 9     | Idempotency **confirmed** — the open question from the audit. Also: the lookup does not filter `deletedAt` (unlike seed-permissions), the signing-key check requires `active = true`, and there is no concurrency guard                                                                  |
| `src/migrations/`             | —     | Still 2,772 lines of unaudited SQL. No lens reads it — see [Backlog](#backlog)                                                                                                                                                                                                           |

**No Tier 0 was found, and the "not yet found" caveat above can now be retired** for everything except the migration SQL. What the lens did produce is a set of characterized-but-unfixed behaviors, deliberately pinned by a test rather than changed under a code-quality story; the sharpest is `bootstrap.ts`'s advisory lock not being session-pinned, which is in [Backlog](#backlog).

**One operational lesson, recorded because it will recur in pass 5.** `connection.test.ts` uses `vi.resetModules()` + dynamic import to get a fresh module singleton per test, and `./connection` pulls the 110-table schema barrel. Unmocked, that barrel is re-evaluated once per test; the file took 7,695 ms and the first cold import blew vitest's 5 s default **in CI only**. `vi.mock('../schemas', …)` took it to 175 ms. `drizzle` is mocked in that file, so the real schema is never needed. Raising the timeout would have hidden the cost rather than removed it.

### The permission-condition collision {#the-permission-condition-collision}

Filed during the pass as a Tier 0 fail-open privilege escalation. **It is not one**, and the correction is worth keeping because of how it was reached: the reviewer asked which of the two colliding rules was more recent and whether any intent was documented — neither question is answerable by the greps that produced the finding.

`PERMISSION_MAPPINGS` lets several groups declare the same `resource:action`, but `permissions` has one row per pair and `group_permissions` has **no `condition` column**, so only the first-declared condition survives. `PermissionChecker` treats `condition == null` as an unconditional grant that beats a conditional one. That much is real.

What disproved the escalation:

- `git blame` puts every ApiKey mapping and group definition in **one commit** (`b410d0f5`, PR #7). Neither declaration is newer; the condition has **never** been persisted.
- The three ApiKey groups have **identical** permissions and differ only in `assignedRoles` — the tiers differ on _member management_, not on resource access, which matches the documented intent.
- `resource.createdBy` appears **exactly twice** in the entire model, both in `APIKeyDev`, matching no convention.
- ApiKey mutations register **no `resourceResolver`**. `condition-evaluator.ts:51-55` returns `undefined` for `resource.*` when `resolvedResource` is null, so had the condition ever been persisted it would have **denied** — `OrganizationDev` could delete or revoke _nothing_.

**Disposition: dead configuration plus a latent trap, not a live defect.** Slice 3 added a startup warning naming the losing group and the discarded condition, so the next collision is announced instead of silent. Both remaining arms were closed by the [follow-up story](https://github.com/grant-js/grant/blob/main/plans/2026-08-14-database-cq-followups-stack.md): `ApiKeyDev`'s conditions were removed, and Project/Tag declarations were aligned to the scoped condition already persisted (trace: safe / fail-closed).

---

## What this pass's method surfaced {#what-this-passs-method-surfaced}

Five process findings, all reusable — the first three from the audit, the last two from remediation:

**Fan-out is an optimization, not a correctness requirement.** All three lens agents died on a session limit mid-pass. Lenses 1–6 were then re-run inline and produced the findings above, including the two sharpest ones (the drizzle-config divergence and the audit-table repetition sizing). What was genuinely lost was _depth on lens 7_ — the one lens whose value comes from executing code rather than reading it, and therefore the one least substitutable by a fast inline re-run. **If agents are lost mid-pass, re-run the reading lenses inline and protect the budget for lens 7.**

**A TypeScript-only line count under-measures a database package by a third.** `src/migrations/` is 2,772 lines of SQL — 30% of this unit — and every lens command inherited from passes 1–3 is written against `.ts`. The rubric's lens commands need a per-unit review before the pass starts, not after.

**Greps fail in both directions.** The rubric's rule-1 corollary warns about a checker that silently finds nothing. This pass hit the mirror image twice in one lens: a substring match that confidently found 52 non-existent `tenantId` columns, and a line-anchored pattern that confidently found 0 of a table that does exist. Both would have become filed findings without verification. **Verify a grep's hits, not just its zeroes.**

**A test can pass without testing anything, and the coverage number will not tell you.** Rule 1's corollary — "prove the check fires by planting a violation" — was written for guardrails. This pass found it applies just as hard to tests: an inherited assertion could not fail, and it was still counted toward the coverage lens's result. **Mutate the code and confirm red before counting a characterization test.** The generalization is now carried into the rubric.

**The reviewer's question was the finding.** The pass's only Tier 0 candidate was withdrawn after a single question — _which of the colliding rules is newer, and is the intent documented anywhere?_ Neither is answerable by grep, and both turned out to be decisive: `git blame` put both declarations in one commit, and reading the group definitions showed the tiers were never meant to differ on resource access. **When a finding rests on two rules disagreeing, date them and look for intent before filing severity.**

---

## Recorded decisions {#recorded-decisions}

The two Tier 3 questions this story was asked to settle. Both are decided; neither required a code change.

### Env fallback in libs: `options.env ?? getEnv()` stays, but it is the exception

`grant-rls-login-role.lib.ts` accepts an optional `env` and falls back to `getEnv()`. `connection.ts` takes config strictly and reads no env at all. That looked like drift.

**Decision: both are correct as written, and the difference is meaningful.** `connection.ts` is a library the composition root configures — an env read there would be a layering violation, since adapter packages must not read env directly. `grant-rls-login-role.lib.ts` is the shared body of a **CLI entry point** (`db:grant-rls-role`, and the second half of `db:migrate`), where the caller is a shell, not a composition root. The optional parameter is what makes it testable — [`grant-rls-login-role.lib.test.ts`](https://github.com/grant-js/grant/blob/main/packages/%40grantjs/database/src/grant-rls-login-role.lib.test.ts) injects `env` at 23 call sites across its 28 tests and exercises the fallback in exactly one.

**The rule going forward:** env fallback is allowed only in the body of a CLI entry point, and only as `options.env ?? getEnv()` so that callers can inject. Anything the composition root wires takes config strictly.

One consequence is worth flagging: `bootstrapDatabase` calls `ensureRlsRestrictedRoleMembership()` with no arguments, so a function that receives `db` and `systemUserId` by injection reaches for the environment mid-body. That is the fallback leaking out of CLI context into server startup. Not changed here — it is correct today because the API server's env is the same env — but it is the first place to look if bootstrap ever needs to target a database other than the one its own env names.

### Three tables without `deletedAt`: deliberate, not drift

`notifications`, `notification_preferences`, and `webhook_delivery_attempts` are the only tables of 110 with no soft-delete column (verified: zero `deletedAt` references in each schema file).

**Decision: deliberate, and consistent with what each table is.** All three are **append-mostly operational records**, not domain entities a tenant owns and expects to recover:

- `webhook_delivery_attempts` is a delivery log. A retained "deleted" attempt is a contradiction — the attempt either happened or it did not.
- `notifications` and `notification_preferences` are per-user ephemera. A soft-deleted notification would still have to be filtered out of every unread count and every list query, buying nothing over a hard delete.

Soft delete exists here to keep tenant-owned records recoverable and to preserve referential integrity for audit trails. None of these three carries either obligation. **No column is being added.** If any of them later becomes subject to a retention or GDPR-export requirement, that is the trigger to revisit — not the inconsistency itself.

---

## Backlog

Story brief and stack plan (pass 4): [`plans/2026-08-10-database-code-quality-brief.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-10-database-code-quality-brief.md), [`plans/2026-08-10-database-code-quality-stack.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-10-database-code-quality-stack.md).

Follow-up story (closes the actionable backlog below): [`plans/2026-08-14-database-cq-followups-brief.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-14-database-cq-followups-brief.md), [`plans/2026-08-14-database-cq-followups-stack.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-14-database-cq-followups-stack.md).

**Resolved by the follow-up story** (see stack PRs on `feat/database-cq-followups`):

- ~~`bootstrap.ts`'s advisory lock is not session-pinned~~ — `withSessionAdvisoryLock` reserves one postgres.js connection for lock/unlock.
- ~~The connection singleton silently ignores a different config~~ — different connection string throws `ConfigurationError`; same-string re-init keeps the first logger; failed close clears the singleton.
- ~~`demo-refresh.ts` truncates and reseeds outside a transaction~~ — truncate + reseed run in `db.transaction`.
- ~~`getDatabase()`'s error names `initializeDatabase()`~~ — names `initializeDBConnection()` and throws `ConfigurationError`.
- ~~`seed-core.ts` does not filter `deletedAt`~~ — soft-deleted system user is restored (`deletedAt` cleared); fixed id cannot be re-inserted.
- ~~Remove `APIKeyDev`'s two dead `resource.createdBy` conditions~~ — set to `null` like Owner/Admin.
- ~~Trace `resource.scope.projects` / `resource.scope.tags`~~ — **safe / fail-closed**. The persisted row already carried `AccountProjectOwner`'s scoped `In` condition; Project/Tag resolvers populate `resource.scope.*` via `getScoped*Ids`. Declarations in `Project*` / `Tag*` / `AccountProjectTagOwner` were aligned to that condition so the seed no longer discards disagreeing nulls. Runtime condition unchanged.

**Owed to a later pass.**

- **Migration SQL is unaudited by any lens.** 79 files, 2,772 lines, containing the actual DDL — index coverage, constraint naming, and whether any migration is destructive-without-guard are all questions no current lens asks. This likely deserves its own lens rather than being folded into an existing one.
- **A "0 dead tables" claim is not supported.** `knip` cannot see Drizzle relation references or SQL-string references ([Tier 4](#tier-4-dead-surface)). Determining whether any of the 110 tables is genuinely unread needs a different method — cross-referencing `apps/api`'s repositories against the schema barrel.
- **The audit-log table factory** ([2.1](#tier-2-abstraction-opportunities)) — 53 tables × 18 lines, two of which diff to 0 entity-normalized. Deferred because it needs a `db:generate` diff spike first: the extraction is only safe if it provably emits identical DDL.
- **Widening the guardrails to `@grantjs/schema` and the adapter packages** — each is that pass's own first slice, per the standing rule.
- **The rubric's lens commands assume `.ts`** and under-measure an SQL-heavy unit by a third. Belongs in the rubric's method section, not in a database story.
