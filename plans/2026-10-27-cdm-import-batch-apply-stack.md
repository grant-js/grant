# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-10-27-cdm-import-batch-apply-brief.md](./2026-10-27-cdm-import-batch-apply-brief.md). Diagnosis: [CDM import performance diagnosis](./2026-10-27-cdm-import-performance-diagnosis.md) (do not re-diagnose). ADR 0002: `decisions/0002-long-running-cdm-sync-beyond-lambda.md`. Prior measurement write-up: `plans/2026-09-09-aws-followups-closeout-measurements.md` (28,880-entity / 62.3 min — **inverse** shape; not the key-fanout baseline).

Gates 1–2 approved by Alejandro 2026-10-27. Copy this brief + stack into repo `plans/` on the trunk with the first slice.

## Metadata

- **Slug**: `cdm-import-batch-apply`
- **Story brief**: `plans/2026-10-27-cdm-import-batch-apply-brief.md` (store copy linked above; copy into repo `plans/` with the first slice)
- **Status**: approved — Gate 2 passed 2026-10-27 by Alejandro / in-progress
- **Story trunk**: `feat/cdm-import-batch-apply` from `main`
- **worktree_path**: not required unless another writer is on `main` / another story trunk in the same checkout

**Slug justification:** `cdm-import-batch-apply` is the story ADR 0002 already called out (batch apply, not the Fargate hatch). It names the outcome — apply a CDM document without one HTTP-mutation-shaped service call per edge — not one tactic (`dedupe-roles`, `hash-outside-tx`). Matches H1–H4’s problem-shaped slugs (`iam-request-chassis`, `iam-authorization-path`).

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [ ] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

Architect stays off the roster unless a new `@grantjs/core` port appears (batched `IUserRoleService` / `IGroupPermissionService` / `IApiKeyService`, or a change to `ICdmEntityHandler.apply`). None expected if import-only batch methods land on existing ports and HTTP `addUserRole` / `createApiKey` stay sequential. Activate Architect then, before writing that slice.

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

Slice 4 is **optional**: PE decides at the end of slice 2 (or 3 if keys are taken) from the new measure numbers. Cheaper KDF for BYOK and Fargate are **not** slices — see [Out of this stack](#out-of-this-stack).

| #     | Branch                                 | Base                          | Concern                                         | Owner role | Review bar                                        | PR                                                 |
| ----- | -------------------------------------- | ----------------------------- | ----------------------------------------------- | ---------- | ------------------------------------------------- | -------------------------------------------------- |
| 1     | `feat/cdm-import-batch-apply-measure`  | `feat/cdm-import-batch-apply` | Key-fanout first + repeat baseline              | Backend    | light                                             | [#614](https://github.com/grant-js/grant/pull/614) |
| 2     | `feat/cdm-import-batch-apply-pivots`   | prior slice                   | batch user-roles + group/project pivots         | Backend    | security-full                                     | [#615](https://github.com/grant-js/grant/pull/615) |
| 3     | `feat/cdm-import-batch-apply-keys`     | prior slice                   | batch key insert / hash-outside-TX at bcrypt-10 | Backend    | security-full                                     | [#617](https://github.com/grant-js/grant/pull/617) |
| 4     | `feat/cdm-import-batch-apply-snapshot` | prior slice                   | snapshot / repeat — **skipped** (see below)     | Backend    | light (security-full if export isolation changes) | skipped after #617 remeasure                       |
| final | `feat/cdm-import-batch-apply`          | `main`                        | integration                                     | Principal  | deep + security-full                              |                                                    |

Prefer layer order: **db → schema → api → web**. This story has no schema/web slices. Slice 1 is the existing measure tool + a key-fanout fixture + docs. Slices 2–4 are `apps/api` CDM apply / job TX. Optional db index only if PE names it after measure.

**Collapse rules:** Do not fold slice 2 into 3 (RBAC pivots vs API-key hashing are different review bars and different blast radii). Slice 3 may be **skipped** if slice 2 + re-measure already meet the wall-clock goal _and_ keys are no longer in the top cost band — record the skip at slice-2 end; do not silently omit. Slice 4 may be skipped the same way.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk — only after Alejandro Gate 1–2
git switch -c feat/cdm-import-batch-apply main && git push -u origin feat/cdm-import-batch-apply

# Copy store plans into repo if they are not there yet:
#   plans/2026-10-27-cdm-import-batch-apply-brief.md
#   plans/2026-10-27-cdm-import-batch-apply-stack.md

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/cdm-import-batch-apply feat/cdm-import-batch-apply-measure

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/cdm-import-batch-apply <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/cdm-import-batch-apply-pivots
# later, unless skipped:
gh stack add feat/cdm-import-batch-apply-keys
gh stack add feat/cdm-import-batch-apply-snapshot

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking) (repo path once this file lives in `plans/`). **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Never skip husky (`--no-verify`, `HUSKY=0`). Open PRs as `grantjs-agent` via `GRANTJS_AGENT_TOKEN` / `gh`. Agents never self-merge.

## Slice notes

### 1 — Measure (what does key-fanout cost on current `main`?)

- Owner files: `apps/api/tests/tools/measure-cdm-import.ts`, `apps/api/tests/helpers/cdm-scale-fixtures.ts` (`CDM_SCALE_PROFILES` / `generateCdmAtScale`), `apps/api/tests/unit/lib/cdm/cdm-scale-fixtures.test.ts`, committed write-up (`docs/benchmarks/` or a short addendum next to the diagnosis — PE picks at slice start; do not invent a new harness). Command: `pnpm --filter grant-api measure:cdm-import` (and `--repeat`). Disposable DB only (`pnpm test:e2e:up`).
- Today: existing profiles are **many users, 0–1 API key each** (`apiKeyRatio`). Key-fanout is the inverse: **11 users × ~102 keys**, **1,883 role listings / 7 templates**, **494 group→permission links**. The 62.3 min / 28,880-entity row and the ~48–105 statements/entity model do not include that key + listing fan-out. Diagnosis wall-clock shares are code-shape estimates, not a new production trace.
- Outcome: add a key-fanout fixture (1,124 keys, 1,883 role listings, 494 group-permission links, 11 users, 7 roles, 57 groups; repeated `users[].roles` keys, not 1,883 distinct roles). Run first + `--repeat`. Record date, SHA, environment, snapshot vs apply seconds, every `SyncProjectResult` counter, and a short statement-count / hot-function sketch. Refuse a vacuous pass (existing tool already rejects all-zero counters). **Do not invent p50/p95/p99. Do not publish a new Lambda-fit SLA.** Keep the diagnosis’s “significant cut” as the story goal, not a fabricated minute target.
- Light review. Security is not required unless this slice ships production apply code (fixture + measure tool + docs only).
- **UX:** no web files.
- **Fan-out:** none. Serial; one writer.
- **Slice-1 start (2026-10-27):** Write-up is `docs/benchmarks/cdm-import-key-fanout.md`. Existing `measure:cdm-import` only. Docker was not available on the Cloud Agent VM; measure ran against a disposable local PostgreSQL 16 after the same migrate/seed as `e2e.sh`.
- **Slice-2 start (2026-10-27):** Import-only batch on existing ports (`addUserRolesForCdmImport`, `addGroupPermissionsForCdmImport`, `addProjectPermissionsForCdmImport`, `addProjectResourcesForCdmImport`). Apply-time unique `(user, role)` writes; `userRolesAssigned` still counts listings. HTTP `addUserRole` / `addGroupPermission` unchanged. No key/KDF work.
- **Slice-3 start (2026-10-27):** Import-only batch on existing ports (`createApiKeysForCdmImport`, `addProjectUserApiKeysForCdmImport`, `deleteApiKeysForCdmImport`). Worker hashes BYOK secrets at bcrypt-10 before the import TX; apply inserts hashes only. HTTP `createApiKey` unchanged. No KDF / rounds change.

### 2 — Batch pivots and roles (the structural N+1)

- Owner files: `apps/api/src/lib/cdm/entities/user-assignment.cdm-entity.ts` (1,883 × `addUserRole`), `apps/api/src/lib/cdm/cdm-entity-builder.ts` (`createDocumentGroup`, `ensureProjectPermissionAndResource`, list-all `*Has*`), `apps/api/src/lib/cdm/expand-cdm-sync-input.lib.ts` (`users.roles` → `roleTemplateKeys`, **no dedupe** today), `apps/api/src/services/user-roles.service.ts` (`addUserRole` → exists + full `getUserRoles` list), group/project pivot services used by the builder, `apps/api/src/services/project-import.service.ts` (still one apply envelope). Tests: `tests/unit/lib/cdm/*.cdm-entity.test.ts`, `cdm-handler-registry.test.ts`, e2e listed in the brief.
- Today: every handler `apply` is `for (const row of input) { await service… }`. Duplicate role listings still pay 4–8 statements. `groupHasPermission` / `addGroupPermission` / `ensureProject*` re-list the whole project as tables fill. Registry order and `runWithEventSuppression` stay.
- Outcome: set-based membership tests + multi-row inserts (or equivalent) for user-roles, group→permissions, and project pivots. Expand-time or apply-time **dedupe of `users[].roles`** is in scope and should be documented. **`userRolesAssigned` / `groupPermissionsLinked` / `project*Linked` semantics stay today’s counters** for fixtures e2e already locks; if a unit test encodes “one `addUserRole` call per listing,” update that unit — do not weaken e2e. Merge still creates new role/group rows. Replace still teardowns then applies. HTTP `addUserRole` / `addGroupPermission` used by GraphQL/REST stay sequential unless a shared batch helper is strictly import-called.
- **Atomicity:** still all-or-nothing for the **whole** import (including keys and snapshot, even if those slices have not landed yet). Savepoints inside the envelope are allowed; committing a prefix of the graph is not. Do not set `SECURITY_ENABLE_RLS=false`. Do not raise `DB_POOL_MAX`.
- **E2e lock:** adapt apply to the locked tests. Same merge/replace/isolation/rollback outcomes.
- Tests: existing CDM entity / registry / replace-teardown stay green; add unit coverage that duplicate role listings do not require N service round-trips, and that a mid-apply throw still rolls back pivots already written in the envelope. Security-full review (independent Security, not the author) **before** gate 3, not folded into gate 4 ([Agentic SDLC § Fan-out](../docs/contributing/agentic-sdlc.md#fan-out-parallelism)).
- **UX:** no web files.
- **Fan-out:** independent Security + Verifier on this slice after the author stops writing; they share the tree (no second worktree).

### 3 — Keys (batch insert / hash-outside-TX — no KDF change)

- Owner files: `apps/api/src/lib/cdm/entities/project-user-api-key.cdm-entity.ts`, `apps/api/src/services/api-keys.service.ts` (`createApiKeyForCdmImport`), `apps/api/src/lib/token.lib.ts` (`hashSecret` → `bcrypt.hashSync`, default 10), project-user API-key pivot service. Interactive `createApiKey` stays as it is.
- Today: 1,124 sequential hash-in-TX + insert + audit + pivot + audit. `hashSync` blocks the event loop on the worker CPU. Diagnosis rank 1 (~2–6 min on this payload).
- Outcome: multi-row insert + set membership for keys/pivots, and/or hash **before** the import TX (or async/worker threads) at **bcrypt-10**. Persist only hashes. Do not log or audit the plaintext secret. `projectUserApiKeysCreated` stays 1,124 for this fixture. Client-id uniqueness checks (`assertScopedClientIdAvailable`) stay fail-closed when `clientId` is present.
- **In this slice:** mechanism only. **Out of this slice (and this stack):** cheaper KDF, lower `TOKEN_BCRYPT_ROUNDS`, “high-entropy BYOK can be SHA-256,” skipping hash, hashing in the API Lambda request path for interactive creates.
- If slice 2’s re-measure already shows keys are not the remaining minutes _and_ the key-fanout first import met the story goal, PE records **skip slice 3** at slice-2 end. If keys still dominate but the only remaining win is a cheaper KDF, **skip this slice too** and leave KDF as a follow-on story — do not smuggle a product decision into a “performance” PR.
- **E2e lock:** key create / replace teardown / export-omits-secrets stay. Do not weaken secret-redaction tests.
- Tests: unit that a CDM key is stored hashed; mid-batch throw rolls back already-inserted keys in the envelope; replace still hard-deletes CDM keys (batch delete is allowed). Security-full (independent Security) before gate 3.
- **UX:** no web files.
- **Fan-out:** independent Security + Verifier; same tree.

### 4 — Snapshot / repeat (optional)

- Owner files: `apps/api/src/jobs/project-sync.job.ts` (`exportProjectCdm` + `saveSnapshot` + `importProjectCdm` in one `withTransaction`), `apps/api/src/services/project-export.service.ts` / CDM `export` handlers (API-key **identities** only). Measure tool `--repeat` is the oracle.
- Today: first import into an empty project — snapshot is cheap. Repeat — snapshot walks the graph the first import just wrote (11 users × ~102 key identities × large `users[].roles`) **before** apply, then merge **creates again**. Best explanation for “11 min succeeded, next run exceeded 15.”
- Outcome (only if still needed): cheaper snapshot inside the same all-or-nothing envelope, and/or memoized list-all for the second apply. Do **not** commit the snapshot in a transaction that can survive a failed apply (today they roll back together — keep that). Do **not** implement `mode.onConflict` upsert so the second merge “is faster.”
- Skip if first+repeat after slice 2/3 already show a significant cut and a repeat that is explained (recorded numbers, not a guess).
- **Skip recorded 2026-10-27** after #617, apply SHA `e99635c9`, same harness as slice 1 (`docs/benchmarks/cdm-import-key-fanout.md`). First **17.35 s** (snapshot 0.05 s, import 17.30 s) / repeat **17.20 s** (snapshot 0.04 s, import 17.16 s) vs slice 1 65.73 s / 65.30 s. SQL 20,438 calls / 0.81 s vs 59,047 / 1.87 s. Repeat is merge-creates-again; snapshot is not the remaining minutes. No slice-4 branch or PR.
- Review: light unless export isolation or snapshot visibility (`hasSnapshot`, `GET …/snapshot`) changes — then security-full.
- **UX:** no web files.

## Out of this stack

These are explicit **non-slices**. Do not add them under a “while we’re here” at slice start.

| Item                                                            | Why it stays out                                                                                                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fargate / `JOBS_SYNC_RUNTIME=container` / `run-sync-job.ts`** | Ops. ADR 0002 hatch already exists so a long job can finish. It does not make sequential apply fast. Enable in deploy if a key-fanout job still exceeds 15 minutes after this story; that is not a Grant code slice. |
| **Cheaper KDF for BYOK**                                        | Product + security decision (what we store, what `verifySecret` accepts, interactive vs import). First stack may hash outside the TX or batch inserts at bcrypt-10 only.                                             |
| **`mode.onConflict` / upsert-by-`externalKey`**                 | Product: merge today always creates new roles/groups/keys. A faster second merge that skip-creates is a different story.                                                                                             |
| **Raising `CDM_IMPORT_MAX_ENTITIES`**                           | Would not have blocked key-fanout (counts roles/users/resources/permissions/groups/tags, not keys or links).                                                                                                         |
| **RLS off / `DB_POOL_MAX` bump**                                | Apply holds **one** connection. See `docs/advanced-topics/transactions.md`.                                                                                                                                          |
| **Rust rewrite**                                                | Preferences / platform rule.                                                                                                                                                                                         |
| **H1–H4 HTTP path**                                             | Diagnosis: they barely touch the worker apply loop.                                                                                                                                                                  |
| **Skipping audit / re-enabling entity webhooks**                | Contract.                                                                                                                                                                                                            |
| **Committing partial graphs**                                   | Alejandro: all-or-nothing. Mechanism may change; outcome may not.                                                                                                                                                    |

## Dependencies / notes

- Slice 1 before 2 so `main` has a written key-fanout baseline (first + repeat). Slice 1 must not invent a minute target.
- Slice 2 before 3 because pivots/roles are the structural N+1 and do not need a KDF decision; keys are the bcrypt band and must not drag a product decision into the first RBAC PR.
- Slice 4 last and optional — repeat cost is snapshot(existing) + apply; applying faster first changes what the snapshot walks.
- **Atomicity (Alejandro):** keep import all-or-nothing. One TX (today), savepoints, or an equivalent rollback envelope. Never chunk into committing partial graphs. A timeout still rolls back.
- **E2e lock (preferences):** implementation adapts to locked tests; never the reverse.
- Copy this brief + stack into repo `plans/` on the trunk (or slice 1) **after** Alejandro approves Gates 1–2.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Fan-out that is free: Security and Verifier on slices 2 and 3 after the author stops writing. Do not put two writers in one tree.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-10-27 by Alejandro.
- [ ] Gate 3: Stack PRs merged into trunk (light on 1 and on 4 if export isolation is unchanged; security-full on 2 and 3).
- [ ] Gate 4: Story → `main` deep + security-full — not open.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
