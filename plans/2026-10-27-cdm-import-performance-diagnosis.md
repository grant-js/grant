# CDM import performance diagnosis (Alteos)

**Audience:** Grant / Alteos — why one production import took ~11 minutes and a later attempt hit Lambda’s 15-minute wall  
**Scope:** diagnosis only. No implementation, no PR, no e2e-contract changes, no language rewrite.  
**Method:** read-only traversal of the import module against the reported counters. Wall-clock shares below are **order-of-magnitude from code shape + prior Grant measurements**, not a new production trace.  
**Date:** 2026-10-27

Related: `docs/core-concepts/cdm-import-export.md`, `apps/api/src/lib/cdm/README.md`, `docs/advanced-topics/job-scheduling.md`, `docs/advanced-topics/transactions.md`, ADR 0002 / `plans/2026-09-09-aws-followups-closeout-measurements.md`.

---

## Executive summary

The 11-minute Alteos import is **Grant-code bound**, not “Lambda is too small” and not “Postgres cannot write 4k rows.” The worker applies the document **one service call at a time, inside one transaction**, through the same single-entity APIs used by HTTP mutations. Two volumes dominate this payload:

1. **1,124 user API keys** — each does a **synchronous bcrypt** (`hashSecret` / `TOKEN_BCRYPT_ROUNDS`, default **10**) _inside_ the open transaction, then insert + audit + pivot insert + audit.
2. **1,883 `addUserRole` calls** for **11 users** and only **7 roles created** — almost certainly **repeated `users[].roles` keys**. The counter increments on every listing; the service still does existence reads (and a full `user_roles` list) even when the assignment already exists.

Everything else (7 roles, 57 groups, 494 group→permission links, 11 provisioned users, one summary event, post-commit cache invalidate) is smaller. H1–H4 (RLS request hold, per-request toolbox, tenant ID lists, tenant-scoped authz invalidate) are **not** why this job is slow. They barely touch the worker apply loop.

Moving the worker to Fargate / Lambda VM **removes the 15-minute ceiling** (ADR 0002 already measured a 28,880-_entity_ import at **62.3 minutes** locally). It does **not** make this apply path fast. The same sequential service API will still take on the order of **10+ minutes** for this shape, and a **repeat** import is worse because the pre-apply snapshot now walks the graph that the first import just wrote.

`CDM_IMPORT_MAX_ENTITIES` (default 5,000) would **not** have refused this document. It counts `roles + users + resources + permissions + groups + tags` only — **not** API keys or role/group links. Alteos is ~457 of those entities and ~3,000 of the expensive edges.

---

## What ran

```
ProjectSyncJob.apply()                          apps/api/src/jobs/project-sync.job.ts
  load job / mark RUNNING                       own short RLS transactions
  [optional] download + validate document       before the import TX (ADR 0009)
  DrizzleTransactionalConnection.withTransaction
    setRlsContext(execData.scope)
    projectExport.exportProjectCdm(...)         rollback snapshot (same TX)
    jobService.saveSnapshot(...)
    projectImport.importProjectCdm(...)         runWithEventSuppression
  markCompleted                                 own short TX + one project_sync.completed
  invalidateCachesForImportResult               after commit, best-effort
```

Default runtime is **`JOBS_SYNC_RUNTIME=inprocess`**. That is the API Lambda (15-minute hard limit). `container` / `run-sync-job.ts` exists because a 28,880-entity import already measured **62.3 minutes**.

`importProjectCdm` is **one transaction for the whole apply** (plus the snapshot). Entity repositories join that transaction; they do **not** open a nested transaction per row (`EntityRepository.create` uses `transaction ?? this.db`).

---

## Reported counters → code

| Reported                                                              | `SyncProjectResult` field   | Where it increments                                         | What the code did                                                                                                                                                                   |
| --------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles created: 7                                                      | `rolesCreated`              | `RoleTemplateCdmEntity.apply`                               | 7 sequential `createRole` (+ project link). **`roleGroupsLinked = 0`** ⇒ `usesGroupPath` was false ⇒ `CdmEntityBuilder.createRoleWithDirectPermissions`, not `createRoleWithGroup`. |
| Groups created: 57                                                    | `groupsCreated`             | `UserAssignmentCdmEntity.apply` → `createDocumentGroup`     | Standalone groups from `users[].groups` / `groups[]`, created on first reference. Not paired with the 7 roles.                                                                      |
| Roles → groups: 0                                                     | `roleGroupsLinked`          | only `createRoleWithGroup`                                  | Roles have no CDM group path.                                                                                                                                                       |
| Groups → permissions: 494                                             | `groupPermissionsLinked`    | `createDocumentGroup` inner `perms` loop                    | 494 sequential `addGroupPermission` after a full-list existence check.                                                                                                              |
| Project → roles / groups / permissions / resources: 7 / 57 / 336 / 46 | `project*Linked`            | builder `ensureProjectPermissionAndResource` + entity apply | First-time project pivots. Later calls still **re-list the whole project** to decide idempotency.                                                                                   |
| Project users: 11                                                     | `projectUsersEnsured`       | `ProjectUserService.addProjectUser`                         | 11 membership upserts. `projectHasUser` lists **all** `project_users` for the project each time.                                                                                    |
| Grant users created: 11                                               | `usersCreated`              | `UserProvisionCdmEntity.apply`                              | 11 `createUser` (+ email auth method if `findBy: email`).                                                                                                                           |
| User roles assigned: 1883                                             | `userRolesAssigned`         | one increment per `roleTemplateKeys` entry                  | **1883 sequential `UserRoleService.addUserRole`**. See below — this cannot be 1883 distinct `(user, role)` pairs against 7 new roles.                                               |
| User API keys created: 1124                                           | `projectUserApiKeysCreated` | `ProjectUserApiKeyCdmEntity.apply`                          | 1124 sequential `createApiKeyForCdmImport` + `addProjectUserApiKey`.                                                                                                                |

Registry order (`createDefaultCdmEntities`): resource (2) → permission (4) → tag (5) → role template (10) → user provision (15) → user assignment (20) → project-user API key (300). `UserProvisionCdmEntity.postApply` (passwords) runs after every `apply`, still in the same TX. Alteos did not report password counters; if hashes were present they are a small extra batched write, not the 11 minutes.

`mode.onConflict` is parsed on the document and **never read** during apply. Merge always creates new role/group/key rows; it does not upsert by `externalKey`.

---

## Ranked time cost (this payload)

Shares assume ~11 minutes wall clock on Lambda → RDS, bcrypt cost 10, and the statement-latency band already measured locally (0.3–0.6 ms/statement) vs ~1 ms Lambda→RDS.

| Rank |                        Cost | Category                                            | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---: | --------------------------: | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 |                **~2–6 min** | (4) API-key / user-role volume + (1) per-row writes | **1,124 × `bcrypt.hashSync`** in `ApiKeyService.createApiKeyForCdmImport`, then 2 inserts + 2 audits each. On a 1-vCPU Lambda, cost-10 bcrypt is commonly **80–200 ms/hash** → **1.5–4 min of CPU alone**, event-loop blocked (`hashSync` is sync). SQL on top: ~4–6 statements/key → **~4.5k–7k statements**.                                                                                                                                                                                              |
|    2 |              **~1.5–4 min** | (1) N+1 + (4) volume                                | **1,883 × `UserRoleService.addUserRole`**. Each call: `userExists` + `roleExists` + `getUserRoles({ userId })` (full list) + either a second `getUserRoles` (already assigned) or insert + `getRoleName` + audit. **5–8 statements per listing**, list grows as unique assignments accumulate. **~9k–15k statements**. Against 7 roles / 11 users this is mostly **duplicate keys in `users[].roles`**, each still paid in full.                                                                            |
|    3 |              **~0.5–2 min** | (1) N+1 list-all                                    | **494 group→permission links** via `createDocumentGroup`: `groupHasPermission` lists **all** group permissions; `addGroupPermission` does group/permission exists + **lists them again**; `ensureProjectPermissionAndResource` lists **all** `project_permissions` and `project_resources` every time. Superlinear as those lists grow toward 336 / 46. **~4k–6k statements**, heavier rows than a pivot insert.                                                                                            |
|    4 |        **~seconds–minutes** | (2) one giant TX                                    | Snapshot + apply share one connection and one WAL/lock horizon. **First import into an empty project:** snapshot is cheap. **Later attempt:** snapshot is `exportProjectCdm` of the _already imported_ graph (11 users × ~102 keys × large `users[].roles`) _before_ apply runs again. The measure harness already warned: a repeat import is snapshot(existing) + apply, and duration models from payload size alone are wrong. This is the best explanation for “11 min succeeded, next run exceeded 15.” |
|    5 |            **~0.5–1.5 min** | (1) + (3) audit                                     | Audit is **not** suppressed. Every create/link writes `DrizzleAuditLogger.logCreate` in the same TX. Events **are** suppressed (`runWithEventSuppression` → `DrizzleEventPublisher.publishMany` no-ops). No webhook/outbox flood during apply. Audit volume tracks inserts (keys, pivots, roles, groups, 494 links, …), not 1,883 duplicate role listings.                                                                                                                                                  |
|    6 |                 **seconds** | (3) post-write                                      | `invalidateCachesForImportResult` after commit: 7 entity-cache deletes for the project scope, `getProjectUsers`, then ~2 related scope keys × 7 namespaces × 11 members (**~150 sequential deletes**). Auth-result prefix delete only for `users[].key.findBy === id` — Alteos _created_ 11 users, so `collectUserIds` is likely **empty**. One `project_sync.completed` at `markCompleted`. Not minutes.                                                                                                   |
|    7 |                 **seconds** | (1) small creates                                   | 7 roles, 57 groups, 11 users, 11 memberships, 336/46 project pivots that actually insert once. Drowned by (1)–(2).                                                                                                                                                                                                                                                                                                                                                                                          |
|    8 | **negligible on this path** | (6) H1–H4                                           | See dedicated section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Lambda vs Grant-code vs Postgres:** Grant’s sequential service API + bcrypt-in-TX is the bottleneck. Postgres is executing many tiny statements, not a heavy plan. Lambda supplies the 15-minute wall, 1 vCPU for bcrypt, and ~1 ms RTT that turns 20k–30k statements into minutes. Raising `DB_POOL_MAX` or turning RLS off does not shorten this job: it uses **one** connection for the apply.

Prior Grant measurement (different shape — many users, few keys): **~48–105 SQL statements per CDM entity**, superlinear as tables fill, 28,880 entities → 62.3 min. Alteos is the inverse: few entities, huge **key + role-listing** fan-out that those entity counts do not include.

---

## 1) Per-row sequential writes (N+1 / one service call per edge)

**This is the structural cost.** There is no batch apply. Every handler `apply` is `for (const row of input) { await service... }`.

### User roles — `UserAssignmentCdmEntity.apply` → `UserRoleService.addUserRole`

```284:291:apps/api/src/lib/cdm/entities/user-assignment.cdm-entity.ts
      for (const key of roleKeys) {
        const rid = ctx.produced.roleIdsByKey.get(key);
        // ...
        await this.userRoles.addUserRole({ userId: effectiveUserId, roleId: rid }, tx);
        ctx.result.userRolesAssigned += 1;
      }
```

`roleIdsByKey` only contains the **7** templates created in this import. Unknown keys throw. So 1,883 listings are 7 keys repeated across 11 users (~171 listings/user).

`addUserRole` (`apps/api/src/services/user-roles.service.ts`):

- `userHasRole`: `existsById(user)` + `getRoles({ ids: [roleId], limit: 1 })` + **`getUserRoles({ userId })` (entire list, no SQL LIMIT in `PivotRepository.query`)**
- If already assigned: **another** `getUserRoles({ userId, roleId })` and return
- If new: insert + `getRoleName` (another `getRoles`) + `audit.logCreate`
- `events.publish('user.role_assigned')` — **suppressed** (no `event_log` row)

Idempotent, but **not cheap**. Duplicate listings still do 4–5 round trips. Unique inserts also write audit.

### API keys — `ProjectUserApiKeyCdmEntity.apply`

```95:137:apps/api/src/lib/cdm/entities/project-user-api-key.cdm-entity.ts
    for (const row of input) {
      const created = await this.apiKeys.createApiKeyForCdmImport({ ... }, tx);
      await this.projectUserApiKeys.addProjectUserApiKey({ ... }, tx);
      ctx.result.projectUserApiKeysCreated += 1;
    }
```

`createApiKeyForCdmImport` (`apps/api/src/services/api-keys.service.ts`):

- Optional `assertScopedClientIdAvailable` (extra reads) when `clientId` is present
- **`hashSecret(clientSecret)` → `bcrypt.hashSync` (`apps/api/src/lib/token.lib.ts`), default 10 rounds**
- `createApiKey` insert + audit `CREATE_API_KEY_CDM`
- No domain event on this path (unlike interactive `createApiKey`)

Then `addProjectUserApiKey`: pivot insert + audit. No extra “list all keys for user” on add (unlike `projectHasApiKey` on delete).

**~102 keys/user × 11 users.** That volume is the payload, not a Grant multiplier — but Grant hashes each secret on the worker CPU, sequentially, while holding the TX.

### Groups → permissions — `CdmEntityBuilder.createDocumentGroup`

Per permission:

1. `groupHasPermission` → `getGroupPermissions({ groupId })` (full list)
2. `GroupPermissionService.addGroupPermission` → `groupExists` + `permissionExists` (`getPermissions` page) + **full list again** + insert + audit
3. `ensureProjectPermissionAndResource` → **`getProjectPermissions({ projectId })` full list** + maybe insert; **`getProjectResources({ projectId })` full list** + maybe insert

`CdmEntityBuilder.groupHasPermission` and the service’s `groupHasPermission` **double-read** the same list. The builder also calls `ensure*` once per permission even after the project pivot already exists (336 unique project permissions, 494 attempts).

Same list-all pattern: `userHasGroup` / `getProjectUserGroups`, `roleHasPermission` / `getProjectRolePermissions`, `projectHasUser` (lists **all project members** to add the 11th).

### Small loops (not the 11 minutes)

- `ResourceCdmEntity` / `PermissionCdmEntity` / `TagCdmEntity`: one create + one project pivot each
- `UserProvisionCdmEntity`: 11 users; email path adds an auth-method write
- `linkResourceAndPermissionTagPivots`: only if the document has resource/permission tags

**Transactions:** N service calls, **1** import transaction. Not “one transaction per entity.”

---

## 2) One giant transaction hold

`ProjectSyncJob.apply` opens **one** `withTransaction` that:

1. `SET LOCAL` RLS (`scopeToRlsContext`)
2. **Exports the current project** (`exportProjectCdm` — all handlers’ `export`, including API-key identities)
3. Writes the snapshot on the job row
4. Runs every apply + `postApply` + tag pivots

If apply throws, snapshot and mutations roll back together (documented in `docs/core-concepts/cdm-import-export.md`). That invariant is why the job is not chunked (`run-sync-job.ts` comment: a partial permission model is a security outcome).

Consequences for time:

- One pooled connection held for the **entire** 11 minutes (job-owned TX, not the HTTP H1 hold).
- Every statement pays RLS policies (`SET LOCAL ROLE` + tenant GUCs).
- WAL / snapshot isolation / lock duration grow with the TX. Repeat imports also **read** the large graph before writing.
- Lambda timeout **aborts the client**; the in-flight TX rolls back. The later 15-minute failure likely left **no** partial import from that attempt — and wasted the snapshot+apply work.

`mode.onConflict` / merge does **not** skip creates. A second merge into the same project **creates another 7 roles, 57 groups, and 1,124 keys**, then pays 1,883 `addUserRole` calls again (now mostly idempotent reads against _new_ role IDs for the new templates). That is slower than the first run, not faster.

Replace mode would also **teardown** first (`RoleTemplateCdmEntity.teardown` loops `deleteCdmRole` / `deleteCdmGroup`; API-key teardown **hard-deletes each CDM key one by one**). A replace of this project after a successful import would add minutes of sequential deletes before recreate.

---

## 3) Post-write work (cache, audit, webhooks, events)

| Work                                                                               | During apply TX?                | Cost on this job                                                                                                                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity domain events (`user.role_assigned`, `group.created`, `api_key.created`, …) | Called, **suppressed**          | ALS check + debug log. **No** `event_log`, **no** webhook enqueue, **no** in-app notification fan-out.                                                                     |
| Audit                                                                              | **Yes**, every mutation         | One insert per create/link. Material, not #1.                                                                                                                              |
| `project_sync.completed`                                                           | After apply, in `markCompleted` | **One** event + audit + payload redact.                                                                                                                                    |
| `invalidateCachesForImportResult`                                                  | **After commit**                | Entity-cache deletes for project + per-member related scopes. Auth-result `keys(prefix*)` only for `findBy: id`. Seconds. Failure is logged and **does not fail the job**. |

H4’s `CacheHandler.invalidatePermissionsCacheForAllScopes` (tenant-filtered `AUTH_RESULT*` scan) is used by **HTTP** role/group/permission handlers. The import worker **does not call it**. Import invalidation is the service method above.

---

## 4) API-key / user-role volume

**1,124 keys / 11 users ≈ 102 keys per user.**  
**1,883 role listings / 11 users ≈ 171 listings per user**, against **7** role templates.

That is a **source-document** shape, not Grant inventing rows. Grant will:

- Hash and insert **every** `users[].apiKeys[]` entry (BYOK `clientSecret` required; export omits secrets, so these are importer-supplied).
- Call `addUserRole` for **every** `users[].roles[]` string, incrementing `userRolesAssigned` even when the pair already exists.

Interactive create of 1,124 keys would be the same bcrypt cost, spread across requests. The import concentrates it on one Lambda, one TX, one event loop.

Passwords (if any) use `credentials.importProjectPasswordHashes` in `postApply` — batched read + writes of **already-bcrypt** hashes. They do **not** re-hash. Not in the reported counters.

---

## 5) Lambda vs Grant-code vs Postgres

| Layer          | What it does to this job                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Grant code** | Dominant. Sequential service API, full-list existence checks, bcrypt-in-TX, snapshot-before-apply.                                                                                                                 |
| **Lambda**     | 15-minute **hard** timeout; typically 1 vCPU (bcrypt serial); ~1 ms/statement RTT to RDS (prior write-up: 3M statements × 1 ms ≈ 50 min RTT alone at enterprise scale). Freeze on timeout rolls back the giant TX. |
| **Postgres**   | Capable of the writes. Pain is **chatty statements + long TX + RLS on each query**, not missing indexes on “insert 1,124 keys.”                                                                                    |

Fargate/Lambda VM: **necessary** so a 11–20+ minute job can finish; **not sufficient** to make Alteos-sized imports snappy. ADR 0002 already chose the hatch because cheap memoization of lookups capped at **~1.54×** and a 28,880-entity import needed **~4.15×** to fit 15 minutes.

---

## 6) H1–H4 vs import

H1–H4 targeted the **HTTP authorize / list** path (`plans/2026-10-24-iam-performance-diagnosis.md`). Mapped to this job:

| Hypothesis                                                | Import impact                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **H1 — RLS holds a pool connection for the HTTP request** | **Does not apply.** The worker is not `contextMiddleware`. It opens its **own** `withTransaction` + `setRlsContext`. Connection hold is the **import TX** (category 2), pre-existing, required for atomicity. Do not set `SECURITY_ENABLE_RLS=false` or raise `DB_POOL_MAX` to “speed up” import (`docs/advanced-topics/transactions.md`). |
| **H2 — per-request toolbox**                              | **Does not apply to the apply loop.** `createAppContext` / `createRepositories` / `createServices` run **once** when the worker process starts (`app-context.lib.ts`, `jobs/index.ts`). Not per entity.                                                                                                                                    |
| **H3 — full tenant ID sets on list**                      | Import does not walk `resolveScopedIds`. `getProjectUsers({ projectId })` in invalidate/membership is 11 rows.                                                                                                                                                                                                                             |
| **H4 — tenant-scoped authz invalidate**                   | **After commit, small N.** Import never used global `permissions.clear()`. H4’s tenant filter on HTTP IAM writes is not on this path. Sequential `cache.*.delete` for 11 members is seconds. **H4 did not make imports slower.**                                                                                                           |

RLS on the job TX still means **every** one of those 20k+ statements is planned under tenant policies. That is a constant factor, not a new H1 hold. Toolbox construction is not in the 11-minute window.

---

## Why the later attempt timed out

Most likely **repeat import into the same project**, not a sudden Grant regression:

1. Snapshot now exports 11 users, 7+ roles, 57 groups, 336 project permissions, **1,124 API-key identities**, and large `users[].roles` arrays — inside the same TX, **before** apply.
2. Apply **creates again** (merge does not upsert roles/groups/keys).
3. Another **1,124 bcrypt hashes** + **1,883 `addUserRole` chains**.
4. Tables are fatter; list-all existence checks are slower (already measured: ms/statement nearly doubled from 620 → 3,650 entities).

First run ~11 min; snapshot+re-apply+growth crossing 15 min is consistent with the code. A **replace** retry would add sequential teardown of the 1,124 keys on top.

Confirm on the job row: `modeStrategy`, `startedAt`/`completedAt`, whether `hasSnapshot` / snapshot bytes jumped, and whether `rolesCreated` on the timed-out attempt (if it failed after counters were computed — usually not; timeout rolls back).

---

## What would actually move the needle (diagnosis only)

Not implementing these. Constraints: **do not weaken e2e**; **do not rewrite the API in Rust**.

1. **Batch / set-based apply** for pivots and keys (multi-row insert, set membership tests). This is the story ADR 0002 already called out. e2e must still see the same counters, isolation, and rollback-on-failure.
2. **Dedupe `users[].roles` (and document it)** so 1,883 listings become ≤ 77 unique pairs (11 × 7). Cheap if the ETL is repeating keys; does not help 1,124 keys.
3. **Hash API-key secrets outside the TX or with a fast KDF for high-entropy BYOK** — product/security decision; today every key pays bcrypt-10 on the worker. Do not drop hashing.
4. **Fargate/container runtime** so 11–25 minute jobs finish. Escape hatch, not a speedup.
5. **Memoize list-all existence checks inside the import TX** (project permissions/resources, per-user roles). Prior measurement: even a perfect memo was only **~1.54×** on the old profile; here it would help (3) and (2) more than (1), because bcrypt dominates keys.

Do **not**: chunk the import into multiple committing transactions (partial authz graph); skip audit; re-enable per-entity webhooks; disable RLS; raise `CDM_IMPORT_MAX_ENTITIES` as a “fix” (it would not have blocked this file).

---

## File / function index

| Piece           | Path                                                                                                                               | Notes                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Worker          | `apps/api/src/jobs/project-sync.job.ts` `apply`                                                                                    | Snapshot + import in one TX; invalidate after commit                          |
| Container entry | `apps/api/src/run-sync-job.ts`                                                                                                     | ADR 0002; memory cache; calls `apply` not `execute`                           |
| Orchestrator    | `apps/api/src/services/project-import.service.ts` `importProjectCdm` / `applyProjectCdmImport` / `invalidateCachesForImportResult` | Event suppression; handler loop; post-commit cache                            |
| Job envelope    | `apps/api/src/services/project-sync-job.service.ts` `markCompleted`                                                                | One `project_sync.completed`                                                  |
| Expand          | `apps/api/src/lib/cdm/expand-cdm-sync-input.lib.ts`                                                                                | `users.roles` → `roleTemplateKeys` (no dedupe)                                |
| Registry        | `apps/api/src/lib/cdm/registry.ts` `createDefaultCdmEntities`                                                                      | Order 2…300                                                                   |
| Builder         | `apps/api/src/lib/cdm/cdm-entity-builder.ts`                                                                                       | `createDocumentGroup`, `ensureProjectPermissionAndResource`, list-all helpers |
| Roles           | `apps/api/src/lib/cdm/entities/role-template.cdm-entity.ts`                                                                        | Direct-permission path when no group link                                     |
| Users           | `…/user-provision.cdm-entity.ts`, `…/user-assignment.cdm-entity.ts`                                                                | 11 creates; 1,883 role assignments                                            |
| Keys            | `…/project-user-api-key.cdm-entity.ts`                                                                                             | 1,124-loop                                                                    |
| bcrypt          | `apps/api/src/lib/token.lib.ts` `hashSecret`; `apps/api/src/services/api-keys.service.ts` `createApiKeyForCdmImport`               | Default 10 rounds                                                             |
| Events          | `apps/api/src/lib/events/event-suppression.lib.ts`, `drizzle-event-publisher.ts`                                                   | Suppressed during apply                                                       |
| Audit           | `apps/api/src/lib/audit/drizzle-audit-logger.ts`                                                                                   | Not suppressed                                                                |
| Entity cap      | `countCdmEntities` in `apps/api/src/lib/cdm/cdm-document.schemas.ts`                                                               | Omits keys and links                                                          |

---

## Bottom line

Alteos is slow because Grant imports **like 3,000 HTTP mutations in a single transaction**, and this document’s expensive mutations are **API keys (bcrypt) and repeated user-role listings**, not the 7 roles / 57 groups. Lambda’s 15-minute cap is a **wall**, not the root cause. Fargate lets the job finish; a faster Grant import needs a **batch apply** (and/or ETL dedupe + cheaper key hashing), without changing e2e contracts.
