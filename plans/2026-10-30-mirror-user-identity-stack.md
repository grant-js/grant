# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-10-30-mirror-user-identity-brief.md](./2026-10-30-mirror-user-identity-brief.md). **Gates 1 and 2 are pending Alejandro**; no implementation, no slice branch and no `gh stack` until both are answered.

Grounded on `origin/main` `815495ea` (v1.20.2, tag commit after #664/#665). Open-source language only: do not name customer tenants.

## Metadata

- **Slug**: `mirror-user-identity`
- **Story brief**: `plans/2026-10-30-mirror-user-identity-brief.md`
- **Status**: draft (Gates 1–2 pending Alejandro)
- **Story trunk**: `feat/mirror-user-identity` from `main` at `815495ea` (exists locally, holds the two plan files; **not pushed yet**: pushing is Alejandro's call once Gate 1 is answered). The `feat/` prefix is deliberate: `ci.yml` runs only for pull requests whose base is `main` or `feat/**` (`.github/workflows/ci.yml:8`), and every slice branch below also starts with `feat/`, so every slice PR gets CI, including `pnpm test:e2e` (`:196`).
- **worktree_path**: `/Users/aleheredia/workspace/worktrees/grant-platform-feat-mirror-user-identity` (holds the trunk; slice branches are created from it after Gate 2 by `gh stack init` / `gh stack add`, which check the slice out in this worktree, or in a second worktree when two slices run at once)
- **Release**: **minor, v1.21.0** (`grant-api`, `@grantjs/schema`; `grant-web` only if it renders the new counter). Justification: the three changes are additive (a new optional import field, a new result counter, a new envelope attribute on three event types, a new table nobody reads but Grant) and break no caller, which is why not major; but one of them is a database migration and two add to a documented contract (the CDM document and `SyncProjectResult`), which is a feature, not a fix. The patch precedent, v1.20.2, was one additive envelope field without a migration. Each slice carries its own changeset (slice 1 patch, slices 2 and 3 minor); the version PR takes the highest bump. If Gate 1 question 10 says patch, slices 2 and 3 write `patch` and the result is v1.20.3.

**Slug justification:** names the outcome (a user's identity is the same on both sides of the mirror: created once, deleted once) rather than the three tactics (`grant-user-id`, `api-key-subject`, `tombstone`).

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect — not needed: one new table, additive fields, no boundary change; the tombstone decision is recorded in the brief and the docs (Gate 1 may ask for an ADR)
- [x] Senior Backend
- [ ] Senior Frontend — the dashboard renders `SyncProjectResult` counters; if `apps/web` lists `passwordsSkippedExisting`, slice 3 adds one row there under Backend ownership, no separate frontend slice
- [x] Senior QA
- [x] Senior Security — **blocking** on slices 2 and 3 (tenancy-shaped lookup and a user-to-key binding; a deletion path writing a fingerprint of a possible address under RLS); **comment** on slice 1 unless Gate 1 question 9 raises it
- [x] Verifier

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**; `gh stack add` the next branch immediately before writing it.

**Order and the reason.** Slice 1 (U3) is the smallest and shares no file with the other two (`api-keys.service.ts`, `api-keys.handler.ts`, their tests, `events-webhooks-notifications.md`), so it goes first: it is reviewable on its own and lands in the trunk whatever happens above it. Slice 2 (U2) is the import-side change the mirror needs first for user creation. Slice 3 (T) stacks on slice 2 because both edit the same code: the tombstone check sits at the two `createUser` sites in `UserProvisionCdmEntity.apply` that slice 2 reshapes, and slice 3's rule "never block a key that resolves to a live identity" is true for a matched user only because slice 2's row-aware lookup exists. **Overlapping files found** (slices 2 and 3): `apps/api/src/lib/cdm/entities/user-provision.cdm-entity.ts`, `apps/api/tests/unit/lib/cdm/user-provision.cdm-entity.test.ts`, `apps/api/src/lib/cdm/cdm-internal.types.ts`, `packages/@grantjs/core/src/ports/services/cdm-entity-handler.port.ts` (slice 3 adds `skippedUserKeys`; slice 2 reads the context), `docs/core-concepts/cdm-import-export.md` (same "Provisioned users" section), `apps/api/src/lib/cdm/README.md`, the e2e sync-job helpers. Slice 1 overlaps with neither.

| #     | Branch                                     | Base                                      | Concern                                                                                                                                                                                                                                                                                                       | Owner role | Review bar                    | PR  |
| ----- | ------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------- | --- |
| 1     | `feat/mirror-user-identity-api-key-owner`  | `feat/mirror-user-identity`               | U3: `subjectUserId` (and explicit `projectIds`) on `api_key.revoked`, `api_key.rotated`, `api_key.created`; one shared owner resolver; `owner` option on `createApiKey`; sentinel-secret test; docs; changeset                                                                                                | Backend    | light (proposed; Gate 1 q. 9) |     |
| 2     | `feat/mirror-user-identity-import-match`   | `feat/mirror-user-identity-api-key-owner` | U2: `key.grantUserId` on a `findBy: key` user (schema, zod, expand, internal type); match and refusal rules in the provision entity; row-aware `findUserIdByCdmImport`; `collectUserIds`; unit, repository and e2e tests; docs; changeset                                                                     | Backend    | security-full                 |     |
| 3     | `feat/mirror-user-identity-tombstone`      | `feat/mirror-user-identity-import-match`  | T: `cdm_import_tombstones` table and migration 0093; repository and port; fingerprint function; write in `deleteUser` on self-deletion; skip at the two create sites with `ctx.skippedUserKeys`; downstream drops; `usersSkippedTombstoned` through GraphQL, REST, OpenAPI, job mapping; e2e; docs; changeset | Backend    | security-full                 |     |
| 4?    | `feat/mirror-user-identity-tombstone-read` | `feat/mirror-user-identity-tombstone`     | **Only if Gate 1 question 8 says so**: `POST /api/projects/{id}/sync/tombstones/check` + `cdmImportTombstoned` query (keys in the body, booleans out); `boot-parity` changes by that one route                                                                                                                | Backend    | security-full                 |     |
| final | `feat/mirror-user-identity`                | `main`                                    | integration                                                                                                                                                                                                                                                                                                   | Principal  | deep                          |     |

**Fan-out.** Slices 1 and 2 are independent and may be written at the same time by two writers in **two worktrees** (slice 2's branch then rebases onto slice 1's tip with `gh stack sync` before submit, or is added once slice 1 is pushed); slice 3 waits for slice 2. Within a slice: Verifier after the author; Security reads slices 2 and 3 as a reviewer who is not the author (agentic-sdlc § Fan-out), scheduled before gate 3 for each, not folded into gate 4.

**Size and the fallback seams.** Estimates: slice 1 about 80 lines of source and 250 of tests and docs; slice 2 about 200 and 500; slice 3 about 350 and 650. If an implemented diff is too large to review at once, the executor does **not** hand over a mega-diff: it stops and reports the split. Slice 1 and 2 have no seam worth cutting. Slice 3 splits at the seam the code has: `feat/mirror-user-identity-tombstone-write` (table, migration, repository, port, fingerprint function, the write in `deleteUser`, its unit tests, the table's docs) below `feat/mirror-user-identity-tombstone-skip` (the import skip, downstream drops, the counter through every layer, e2e, the import docs, changeset). The write slice alone is inert (nothing reads the table), so it is safe to land first. This is a fallback, not the plan.

**Could slice 1 be a plain PR to `main`?** Yes, mechanically: it shares no file with slices 2 and 3 and `ci.yml` would run on it. Recommended to keep it in the stack: the receiver pins one release that has all three, so one `main` push, one `release.yml` run and one gate-4 deep review of the assembled result is the point of the trunk (agentic-sdlc § Review bars); as the bottom slice it merges into the trunk first anyway, so nothing above it waits on it any longer than it would on `main`; and a separate PR to `main` would ship v1.20.3 with half the mirror's upstream and force a second pin.

## Stack setup

Root the stack on the story trunk, never the default branch, or the slices target `main` and skip gate 4:

```sh
# Trunk — exists locally with the two plan files. After Gate 1: push it.
cd /Users/aleheredia/workspace/worktrees/grant-platform-feat-mirror-user-identity
git -c core.hooksPath=.husky push -u origin feat/mirror-user-identity

# After Gate 2: init with the FIRST slice branch only.
gh stack init --base feat/mirror-user-identity feat/mirror-user-identity-api-key-owner

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto                                        # --auto: no interactive editor
gh stack link --base feat/mirror-user-identity <pr> <pr> …    # bottom to top; creates/grows the stack ON GitHub

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/mirror-user-identity-import-match
# … work, commit, submit, link; then
gh stack add feat/mirror-user-identity-tombstone

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions before writing each slice, not after:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
gh pr view <bottom-pr> --json baseRefName   # must be feat/mirror-user-identity, never main
```

`gh stack` cannot switch to a branch that is checked out in another worktree, so a slice written in a second worktree is pushed and its worktree removed before `gh stack` is asked to adopt or restack it. See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking). **`--base` is not optional on `link`.** `gh stack submit --auto` opens PRs as **drafts**; mark ready with `gh pr ready <pr>` for gate 3.

**Hooks.** `git config core.hooksPath` is unset in this worktree (verified), so: `git -c core.hooksPath=.husky commit` on every commit (lint-staged runs prettier); `sh .husky/pre-push` by hand before every push (`.husky/pre-push` is mode 755 at `815495ea`, so `git -c core.hooksPath=.husky push` runs it too; run it by hand regardless, it is the full chain: format, lint, dead-code, codegen, type-check, build, synth, tests, secret scan); `pnpm release:check` by hand whenever a changeset is in the diff (a changeset naming an ignored package such as `@grantjs/core` or `@grantjs/database` passes locally and fails CI). Never `--no-verify`, never `HUSKY=0`. A fresh worktree needs `pnpm install --frozen-lockfile --ignore-scripts` before the first commit. Slice 3's migration: `pnpm --filter @grantjs/database db:generate`, rename the file, `db:migrate` against the local stack, and the e2e stack picks it up through `scripts/e2e.sh`. **`boot-parity` must be unchanged** on slices 1–3 (`apps/api/tests/e2e/__snapshots__/boot-parity.e2e.test.ts.snap`); only the optional slice 4 adds a route, and exactly one. Agents never self-merge. Alejandro merges.

## Named contracts (do not rename in the slices)

| Kind                  | Name                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U3 event fields       | `subjectUserId` and `projectIds` are top-level `DomainEventInput` fields (`event-envelope.ts:101-108`), not `data`; the envelope shows the first as `grantsubjectuser`; the second is internal fan-out. `data.before` / `data.after` of the three types are unchanged.                                                                                                            |
| U3 owner rule         | the owning user when `project_user_api_keys` has exactly one live owner for the key, else `null` (`api-keys.service.ts:780-784`, today's delete rule). One private resolver in `ApiKeyService`, e.g. `resolveOwnerSubject(id, tx): { subjectUserId, projectIds }`, used by revoke, rotate and delete.                                                                             |
| U3 create option      | `createApiKeyRequestSchema.owner?: { projectId: uuid; userId: uuid }` (`apps/api/src/services/api-keys.schemas.ts:120`); service-internal. The handler passes it for `Tenant.ProjectUser`, `AccountProjectUser`, `OrganizationProjectUser` (`api-keys.handler.ts:127-150`). Publish stays inside `createApiKey`.                                                                  |
| U2 field              | `CdmKeyResolverInput.grantUserId: ID` (GraphQL), `cdmKeyResolverSchema.grantUserId: z.string().uuid().optional()`, `CdmUserProvisionInternal.grantUserId?: string \| null`. Allowed with `findBy: key` (or omitted `findBy`) only.                                                                                                                                                |
| U2 refusals           | `ValidationError`, position only, three messages: `users[i]: grantUserId names another user than the one already imported under this key`; `users[i]: grantUserId does not name an existing user`; `users[i]: grantUserId is already imported under another key`. `validateSyncInput`: `users[i]: grantUserId is only allowed with key.findBy 'key'`.                             |
| U2 lookup             | `IUserRepository.findUserIdByCdmImport({ projectId, kind, externalKey })` keeps its signature; it now matches the global marker **or** a live membership row's marker joined to a live user. Documented on the port (`packages/@grantjs/core/src/ports/repositories/user.repository.port.ts`).                                                                                    |
| U2 marker             | unchanged shape `{ projectId, kind: 'user', externalKey }` (`buildCdmImportMetadata`, `cdm-import.constants.ts:110-124`), written on the **row** by the assignment step as today; the global user's metadata is never changed.                                                                                                                                                    |
| T table               | `cdm_import_tombstones` (`cdmImportTombstones` in Drizzle): `id`, `project_id`, `kind`, `external_key_fingerprint`, `created_at`; unique `(project_id, kind, external_key_fingerprint)`; RLS as `project_users`. Migration `0093_cdm_import_tombstones.sql`.                                                                                                                      |
| T fingerprint         | `fingerprintCdmExternalKey(kind, externalKey, hmacSecret)` in `apps/api/src/lib/cdm/cdm-api-key-fingerprint.lib.ts`, `hmacSha256Hex(secret, `${kind}\u001f${externalKey}`)`; secret `config.cdm.apiKeyFingerprintHmacSecret` (`env.config.ts:1144`). Empty secret → `''` → no write, one warning.                                                                                 |
| T repository and port | `CdmImportTombstoneRepository` (`apps/api/src/repositories/cdm-import-tombstones.repository.ts`): `insertIgnoringDuplicates(rows, tx)`, `filterTombstoned({ projectId, kind, fingerprints }, tx): Set<string>`; port `ICdmImportTombstoneRepository` in `@grantjs/core` ports/repositories; wired in `createRepositories`, injected into `UserService` and the CDM registry deps. |
| T write point         | `UserService.deleteUser`, beside the `externalKeys` read (`users.service.ts:272-283`), when `this.user?.userId === id`; raw marker keys from a shared marker reader extracted from `event-external-keys.lib.ts:51-70`.                                                                                                                                                            |
| T skip point          | the two `createUser` sites in `UserProvisionCdmEntity.apply` (`user-provision.cdm-entity.ts:133`, `:244`); `CdmApplyContext.skippedUserKeys: Set<string>`; downstream drops in `user-assignment.cdm-entity.ts:566-578`, `project-user-api-key.cdm-entity.ts:407`, `user-provision.cdm-entity.ts:150-191`.                                                                         |
| T counter             | `SyncProjectResult.usersSkippedTombstoned: Int!`, every layer listed in brief T.4.                                                                                                                                                                                                                                                                                                |
| Unchanged             | `findBy: id` semantics; `ifMissing`; `EVENT_IDENTITY_KEYS`; `resolveExternalKeys` output; the e-mail guard; `removeProjectUser`; webhook signing and delivery; all routes (slices 1–3).                                                                                                                                                                                           |

## Slice notes

### 1 — API-key events name the owner (light proposed)

- **Preconditions the executor states in the PR body:** that `createApiKeyRequestSchema` is service-internal (not the GraphQL input), so `owner` adds no API field; that `SECURITY_OWNERS` has no `subject` primitive (`event-catalog.ts:62-66`), so no recipient changes; whether the cascade-lifecycle e2e creates a project-user key it can assert `grantsubjectuser` on.
- **Owner files:** `apps/api/src/services/api-keys.service.ts`, `api-keys.schemas.ts`, `apps/api/src/handlers/api-keys.handler.ts`, `apps/api/tests/unit/services/api-keys.service.test.ts`, the handler test, `docs/core-concepts/events-webhooks-notifications.md:82`, `.changeset/*.md`.
- **Out of this slice:** moving the publish; anything in `data`; the receiver.
- **Fan-out:** Verifier after the author; Security comments (the sentinel test is what it reads).

### 2 — a keyed user names the existing Grant user it is (security-full)

- **Preconditions the executor states in the PR body:** the Gate 1 answers it built to (questions 2 and 3); that the row-aware lookup stays on `users_metadata_idx` / `project_users_metadata_idx` (an `EXPLAIN` on the e2e database); that `IUserService.getUser` excludes soft-deleted users (the docs say the lookup does) or which repository read it uses for liveness; that `addProjectUser` has no cross-tenant check today (`project-users.service.ts:122-170`), so the slice adds no reach.
- **Owner files:** `packages/@grantjs/schema/src/schema/projects/inputs/sync-project-cdm.graphql` (+ `pnpm --filter @grantjs/schema generate`), `apps/api/src/lib/cdm/cdm-document.schemas.ts`, `expand-cdm-sync-input.lib.ts`, `cdm-internal.types.ts`, `entities/user-provision.cdm-entity.ts`, `apps/api/src/repositories/users.repository.ts` and its port, `apps/api/src/jobs/project-sync.job.ts:452-466`, tests (`cdm-document.schemas.test.ts`, `expand-cdm-sync-input.lib.test.ts`, `user-provision.cdm-entity.test.ts`, a repository test, one e2e scenario beside `project-sync-email-identity.e2e.test.ts`), `docs/core-concepts/cdm-import-export.md`, `apps/api/src/lib/cdm/README.md`, `.changeset/*.md`.
- **Out of this slice:** the global marker; export shape; a `usersMatched` counter.
- **Fan-out:** independent of slice 1 (may run in parallel in a second worktree); Security reads the refusal rules, the lookup's SQL and the messages (no key, no address).

### 3 — deletion tombstone (security-full)

- **Preconditions the executor states in the PR body:** the Gate 1 answers it built to (questions 4–8); whether `findByEmail` (`user-authentication-methods.repository.ts:215-233`) excludes methods of soft-deleted users, and the liveness filter added if not; that `deleteOwnUser` is the only self-deletion path (`me.handler.ts:161`); whether `apps/web` renders `SyncProjectResult` counters; the migration's generated SQL (unique index, FK cascade, two policies) pasted in the PR body.
- **Owner files:** `packages/@grantjs/database/src/schemas/cdm-import-tombstones.schema.ts` (+ `schema.ts`, migration 0093), `packages/@grantjs/core/src/ports/repositories/*` (new port) and `ports/services/cdm-entity-handler.port.ts` (`skippedUserKeys`), `apps/api/src/repositories/cdm-import-tombstones.repository.ts` (+ `createRepositories`), `apps/api/src/lib/cdm/cdm-api-key-fingerprint.lib.ts`, `apps/api/src/lib/events/event-external-keys.lib.ts` (shared marker reader), `apps/api/src/services/users.service.ts` (+ `createServices`), `apps/api/src/lib/cdm/entities/user-provision.cdm-entity.ts`, `user-assignment.cdm-entity.ts`, `project-user-api-key.cdm-entity.ts`, `apps/api/src/lib/cdm/registry.ts` (deps), `apps/api/src/services/project-import.service.ts` (result init), `project-sync-job.service.ts`, `apps/api/src/repositories/project-sync-job.repository.ts`, `apps/api/src/rest/schemas/projects.schemas.ts`, `apps/api/src/rest/openapi/projects.openapi.ts`, `packages/@grantjs/schema/src/schema/projects/types/sync-project-result.graphql`, `operations/projects/project-sync-job.graphql`, tests (service, entity, repository, fingerprint, one e2e scenario), `docs/core-concepts/cdm-import-export.md`, `events-webhooks-notifications.md:78`, `apps/api/src/lib/cdm/README.md:48`, `.changeset/*.md`.
- **Out of this slice:** the read API (slice 4 if wanted); a removal mutation; operator deletions; an ADR unless Gate 1 asks.
- **Fan-out:** after slice 2; Security reads the write (what is hashed, what is stored, when), the skip rule and the liveness check, the RLS policies, and the e2e assertions that no key or address appears in the job's result, warnings or logs.

## Out of this stack

| Item                                                                                 | Why it stays out                                                                                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Receiver changes** (read `grantsubjectuser`, emit `grantUserId`, read the counter) | Follow-ups in the receiver's repository once v1.21.0 is released and pinned.                                           |
| **Tombstone read API** and **removal mutation**                                      | Gate 1 questions 6 and 8; a fourth slice if wanted, otherwise later stories.                                           |
| **Marker on the global user for a matched identity**                                 | Policy: a reused identity's global metadata is never changed; the row carries the marker and the lookup reads it.      |
| **Export of matched users as keyed `users[]` entries**                               | The export reads the global marker (`project-export.repository.ts:797-815`); the receiver does not round-trip exports. |
| **`usersMatched` counter**                                                           | Brief non-goal; the row marker shows it.                                                                               |
| **Renaming `CDM_API_KEY_FINGERPRINT_HMAC_SECRET`**                                   | A separate chore (alias plus deprecation).                                                                             |

## Dependencies / notes

- **Depends on v1.20.2 on `main`** (`815495ea`): grant #568 (row marker), #664 (`externalKeys` and the membership read in `deleteUser`) are in it; slice 3 reuses both.
- Slice 3's "never block a live identity" rule depends on slice 2's row-aware lookup for matched users; that is the stacking dependency.
- **Test infrastructure:** unit tests run anywhere; e2e needs the Docker stack (`pnpm test:e2e`, or `pnpm test:e2e:up` while iterating, AGENTS.md § Testing); CI runs e2e on every slice PR here (`ci.yml:8`, `:196`). State in each PR body which suites ran locally; check `gh pr checks <n>`.
- **No customer tenant names** in plans, fixtures, PRs or docs; fixtures use synthetic keys and addresses on `example.com`; no real legacy ids.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Release: `chore: version packages` → **v1.21.0**; then the receiver pins it (its own procedure).

## Human gates

- [ ] Gate 1: Story brief approved — Alejandro (ten questions in the brief).
- [ ] Gate 2: Stack plan approved — Alejandro (order, bars, named contracts, release type, slice 4 yes/no).
- [ ] Gate 3: Stack PRs merged into trunk (slice 1 light unless raised; slices 2–3 security-full).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove /Users/aleheredia/workspace/worktrees/grant-platform-feat-mirror-user-identity` (and any second worktree used for a parallel slice)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
