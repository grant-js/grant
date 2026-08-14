# Stack plan — Database code-quality follow-ups

## Metadata

- **Slug**: `database-cq-followups`
- **Story brief**: [`plans/2026-08-14-database-cq-followups-brief.md`](./2026-08-14-database-cq-followups-brief.md)
- **Status**: approved
- **Story trunk**: `feat/database-cq-followups`
- **worktree_path**: `.worktrees/database-cq-followups` — required; `chore/deps-security-bumps` and `fix/codeql-security-alerts` worktrees are already in flight.

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [x] Senior Backend — all slices
- [ ] Senior Frontend — not active
- [x] Senior QA — test expectation updates with each behavior change
- [x] Senior Security — slices 2 and 5 (blocking)
- [x] Verifier — after every slice

## Ordered slices (PRs)

| #     | Branch                                           | Base                         | Concern                                                                                         | Owner    | Review bar        | PR  |
| ----- | ------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------- | -------- | ----------------- | --- |
| 1     | `feat/database-cq-followups-apikey-dead-conds`   | `feat/database-cq-followups` | Remove `ApiKeyDev` dead `resource.createdBy` conditions                                         | Backend  | light             |     |
| 2     | `feat/database-cq-followups-advisory-locks`      | slice 1                      | Session-pin advisory locks in `bootstrap` + `demo-refresh`                                      | Backend  | **security-full** |     |
| 3     | `feat/database-cq-followups-connection`          | slice 2                      | `ConfigurationError`, correct `getDatabase` message, throw on config mismatch, close hygiene    | Backend  | light             |     |
| 4     | `feat/database-cq-followups-demo-seed`           | slice 3                      | `demo-refresh` truncate+reseed in a transaction; restore soft-deleted system user               | Backend  | light             |     |
| 5     | `feat/database-cq-followups-scope-collision`     | slice 4                      | Trace Project/Tag `resource.scope.*` collision; fix or record decision                          | Backend  | **security-full** |     |
| 6     | `feat/database-cq-followups-docs`                | slice 5                      | Close backlog items in `database.md`; note follow-up story in closed plan                       | Backend  | light             |     |
| final | `feat/database-cq-followups`                     | `main`                       | integration                                                                                     | Principal| deep              |     |

### Fan-out

Serial by default. Slices 1 and 3–4 are file-disjoint from each other in principle, but 2 and 4 both touch `demo-refresh.ts` (lock vs transaction), so keep 2 before 4. Slice 5 may touch `@grantjs/constants` again after slice 1 — stack after 1.

**Security-full on slice 2** — advisory lock failure mode is "every API replica stuck on startup." Independent of the author.

**Security-full on slice 5** — live RBAC condition path; same bar as the original collision investigation.

## Stack setup

```sh
git worktree add .worktrees/database-cq-followups -b feat/database-cq-followups main
cd .worktrees/database-cq-followups
git push -u origin feat/database-cq-followups
gh stack init --base feat/database-cq-followups \
  feat/database-cq-followups-apikey-dead-conds \
  feat/database-cq-followups-advisory-locks \
  feat/database-cq-followups-connection \
  feat/database-cq-followups-demo-seed \
  feat/database-cq-followups-scope-collision \
  feat/database-cq-followups-docs
gh stack submit
```

Root on `feat/database-cq-followups`, never `main`. Carry forward pass 4's merge-topology lesson: verify the trunk contains every slice before gate 4.

## Slice detail

### 1 — ApiKeyDev dead conditions · light

In `packages/@grantjs/constants/src/permissions/permissions.ts`, set `ApiKeyDev` Delete/Revoke `condition` to `null` (match Owner/Admin). Zero runtime effect today (no ApiKey resource resolver); removes the latent trap if one is registered later.

### 2 — Session-pinned advisory locks · security-full

`pg_advisory_lock` is session-scoped. Today lock and unlock are separate `db.execute` calls on the pooled drizzle instance, so unlock can hit a different backend.

**Fix:** reserve one postgres.js connection via `db.$client.reserve()`, issue lock/unlock on that reserved client, release in `finally`. Work (migrate/seed/reset) may still use the pool — the lock only needs to stay held on one session.

Apply to both `bootstrap.ts` and `demo-refresh.ts`. Replace the CHARACTERIZATION tests that pin the broken behavior with tests that assert reserved-session discipline.

### 3 — Connection hygiene · light

In `connection/connection.ts`:

- Empty string → `ConfigurationError`
- `getDatabase()` → `ConfigurationError` naming `initializeDBConnection`
- Re-init with a **different** `connectionString` → `ConfigurationError` (same string: keep return-existing + warn)
- Assign `moduleLogger` only on first successful init
- `closeDatabase`: clear singleton in `finally` so a failed `end()` does not block re-init

Update characterization tests to assert the new contracts.

### 4 — Demo refresh transaction + system-user restore · light

- Wrap `reset` + `ensureSystemUserAndSigningKey` + `seedAll` in `db.transaction` inside `runDemoRefresh`.
- `ensureSystemUser`: if a row exists with `deletedAt` set, clear `deletedAt` (fixed id cannot be re-inserted; aligning with "must exist" rather than seed-permissions' insert-if-missing pattern).

### 5 — Project/Tag scope collision · security-full

Trace `resource.scope.projects` / `resource.scope.tags` for org vs project roles through `getScopedProjectIds` and the condition evaluator. Either:

- land a constants/seed change that makes the surviving condition correct for every group that shares the permission row, **or**
- record in `database.md` why the inherited `AccountProjectOwner` condition is safe for Project\*/Tag\* groups.

Do not invent a `group_permissions.condition` column in this story.

### 6 — Docs close-out · light

Mark resolved backlog bullets in `database.md`, add a pointer from the closed pass-4 stack plan, leave the non-goals (audit-log factory, migration SQL lens, etc.) as still owed.

## Dependencies / notes

- Slice 2 before 4 (`demo-refresh.ts` overlap).
- Slice 1 before 5 (both may touch permissions constants).
- Verification per slice: `pnpm --filter @grantjs/database exec tsc --noEmit`, `lint`, `test`; plus `pnpm --filter @grantjs/constants exec tsc --noEmit` on slices 1 and 5.
- No changeset if only ignored packages change; add one if a published package's public behavior changes in a releasable way.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-08-14, via explicit request to implement follow-ups and open PRs.
- [ ] Gate 3: Stack PRs merged into trunk.
- [ ] Gate 4: Story → `main`.

## Cleanup

- [ ] `git worktree remove .worktrees/database-cq-followups`
- [ ] Local and remote slice branches deleted
- [ ] Stack plan status → `merged-to-main`
- [ ] Update `database.md` backlog (slice 6)
