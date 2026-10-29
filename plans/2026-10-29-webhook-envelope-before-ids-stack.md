# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-10-29-webhook-envelope-before-ids-brief.md](./2026-10-29-webhook-envelope-before-ids-brief.md). **Gates 1 and 2 are pending Alejandro**; no implementation, no slice branch and no `gh stack` until both are answered.

Grounded on `origin/main` `4f9446f4` (v1.20.1, tag commit after #661/#662). Open-source language only: do not name customer tenants.

## Metadata

- **Slug**: `webhook-envelope-before-ids`
- **Story brief**: `plans/2026-10-29-webhook-envelope-before-ids-brief.md`
- **Status**: approved (Gates 1–2, Alejandro 2026-10-29)
- **Story trunk**: `feat/webhook-envelope-before-ids` from `main` at `4f9446f4` (exists, holds the two plan files; pushed). The `feat/` prefix is deliberate: `ci.yml` runs only for pull requests whose base is `main` or `feat/**`, so the slice PR (base: the trunk) gets CI.
- **worktree_path**: `/Users/aleheredia/workspace/worktrees/grant-platform-feat-webhook-envelope-before-ids` (holds the trunk; the slice branch is created from it after Gate 2, in its own worktree or by `gh stack add` from here once the trunk worktree is free)
- **Release**: patch, **v1.20.2** (`grant-api`, plus `@grantjs/schema` if its exported event types change)

**Slug justification:** names the outcome on the envelope (the removed entity's ids survive in `before`), not the tactic (`external-keys`, `event-before-extension`).

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect — not needed: one additive field on an existing envelope, no boundary change
- [x] Senior Backend
- [ ] Senior Frontend — no web change (the dashboard does not render webhook bodies)
- [x] Senior QA
- [x] Senior Security — **proposed blocking** on the slice (tenancy fan-out and personal data both apply; the request said light, Gate 1 question 2 decides)
- [x] Verifier

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**; there is no second branch to add.

**One slice.** The collapse rule applies: part 1 (`data.before` survives for delete and revoke events) is **already true today** (brief, "What is already true"; `webhook-redaction.lib.ts:117-128`, 18 of 20 types, the other two by design) and only a pinning test is missing, so a separate "envelope" slice would be a test-only PR with no behaviour. The pinning test lands with part 2 because part 2 edits the same projection and the test is what proves the edit did not narrow it. No standalone tests or docs slice: tests, docs and the changeset ship with the behaviour.

| #     | Branch                                           | Base                               | Concern                                                                                                                                                                                          | Owner role | Review bar                                        | PR  |
| ----- | ------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------- | --- |
| 1     | `feat/webhook-envelope-before-ids-external-keys` | `feat/webhook-envelope-before-ids` | per-type `before` pinning test (part 1); `externalKeys` on `user.deleted` and `project.user_removed`: resolver, two emission sites, per-subscription filter, unit and e2e tests, docs, changeset | Backend    | security-full (proposed; light if Gate 1 says so) |     |
| final | `feat/webhook-envelope-before-ids`               | `main`                             | integration                                                                                                                                                                                      | Principal  | deep                                              |     |

**Size and the fallback seam.** Estimate: roughly 250 lines of source and 600 of tests, docs and changeset. If the implemented diff is too large to review at once, the executor does **not** hand over a mega-diff: it stops and reports the split, at the seam the code already has, into `feat/webhook-envelope-before-ids-user-removed` (pinning test, shared resolver, `EventExternalKey` type, projection and per-subscription filter, `project.user_removed` and its docs and e2e) and `feat/webhook-envelope-before-ids-user-deleted` (the new membership read, `user.deleted` and its docs, e2e for the multi-project and hard-delete cases, changeset). Slice 1 would then be the one that makes the field exist and filters it; slice 2 only adds a second emitter. Both would be security-full. This is a fallback, not the plan.

With one slice the trunk adds a gate rather than a diff (agentic-sdlc § "Review bars": gate 4 is not a second code review). It is kept because the process roots every story on a `feat/` trunk and the trunk's CI trigger is what gives the slice PR its checks.

## Stack setup

Root the stack on the story trunk, never the default branch, or the slice targets `main` and skips gate 4:

```sh
# Trunk — exists, pushed with the two plan files. Gate 2 approves; then:
cd /Users/aleheredia/workspace/worktrees/grant-platform-feat-webhook-envelope-before-ids

# Init with the ONLY slice branch.
gh stack init --base feat/webhook-envelope-before-ids feat/webhook-envelope-before-ids-external-keys

# After the slice: commit, then BOTH of these.
gh stack submit --auto
gh stack link --base feat/webhook-envelope-before-ids <pr>

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions before writing the slice, not after:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

`gh stack` cannot switch to a branch that is checked out in another worktree, so the trunk worktree is released (or the slice is created in a separate worktree) before `gh stack init`. See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking). **`--base` is not optional on `link`.** `gh stack submit --auto` opens PRs as **drafts**; mark ready with `gh pr ready <pr>` for gate 3.

Hooks: `git -c core.hooksPath=.husky commit` on every commit (prettier runs), `sh .husky/pre-push` by hand before every push (upstream `.husky/pre-push` is mode 644 on branches that predate the mode fix, so git ignores it otherwise), `pnpm release:check` whenever a changeset is in the diff (a changeset naming an ignored package, such as `@grantjs/core`, passes locally and fails CI). Never `--no-verify`, never `HUSKY=0`. A fresh worktree needs `pnpm install --frozen-lockfile --ignore-scripts` before the first commit. **`boot-parity` must be unchanged**: the story adds or removes no route, so `apps/api/tests/e2e/__snapshots__/boot-parity.e2e.test.ts.snap` shows no diff; a diff there is a mistake. Agents never self-merge. Alejandro merges.

## Named contracts (do not rename in the slice)

| Kind               | Name                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field              | `data.before.externalKeys`, an array of `{ projectId: string; externalKey: string }`. **`externalKey`** is the CDM's word for it (`metadata.cdmImport.externalKey`, `resolveCdmExportExternalKey`, the import docs); the repo has no other name. The list, not one value, because a person can be marked by more than one project; the per-entry `projectId` is what lets the projection filter by subscription and lets a receiver pick its own project's key. |
| Present / empty    | Always present on `user.deleted` and `project.user_removed`; `[]` for a Grant-native user or when no key qualifies. Absent means Grant older than v1.20.2.                                                                                                                                                                                                                                                                                                      |
| Types              | `EventExternalKey` exported from `packages/@grantjs/schema/src/events/event-envelope.ts`; `ExternalEventData.before` becomes `EventIdentity & { externalKeys?: EventExternalKey[] }`. `EVENT_IDENTITY_KEYS` is **not** extended (its values are primitives only).                                                                                                                                                                                               |
| Event types        | `EXTERNAL_KEY_EVENT_TYPES = ['user.deleted', 'project.user_removed']`: the projection copies `externalKeys` for these two types only.                                                                                                                                                                                                                                                                                                                           |
| Resolver           | one pure function in `apps/api/src/lib/` (name chosen in the slice, under `lib/events/` or `lib/cdm/`), input: the user's metadata and the membership rows' `{ projectId, metadata }`; output `EventExternalKey[]`. The only reader of `cdmImport` and `cdmSource.legacy.id` for events.                                                                                                                                                                        |
| What qualifies     | the row's `metadata.cdmImport.externalKey` when not e-mail-shaped, else `metadata.cdmSource.legacy.id` (string, trimmed, 1–255 chars, not e-mail-shaped); row wins over the global user; e-mail-shaped = importer's own pattern or any `@`. Nothing else in `cdmSource` is read. (Option B of Gate 1 question 1; option A drops the `legacy.id` fallback.)                                                                                                      |
| Filter             | `buildCloudEventEnvelope(event, source, { projectId })`: keeps entries whose `projectId` equals the delivery's project (the subscription's own `projectId` column, `webhook-subscriptions.repository.ts:111`); without it, `externalKeys` is `[]` (fail closed). Called from `webhook-delivery.service.ts:115`, the only caller.                                                                                                                                |
| Stored vs external | The stored (internal) `before.externalKeys` holds every entry; only the external projection filters. Notification code reads named string fields only (`notification-renderer.ts`, `notification-display-context.ts`) and ignores the array.                                                                                                                                                                                                                    |
| Read points        | `user.deleted`: `UserService.deleteUser`, before `events.publish` (`users.service.ts:272-289`) and before the delete (`:291-293`); membership rows from one new read beside `getUserProjectIds` (`project-links.repository.ts:142`). `project.user_removed`: `ProjectUserService.removeProjectUser`, from the row the delete returns (`project-users.service.ts:471-482`; `returning()` carries `metadata`) and the global user.                                |
| Unchanged          | `EVENT_IDENTITY_KEYS`, the `dropName` rule, `tag.unlinked`, the redaction patterns, the routes, `grantactor` / `grantsubjectuser` / `grantscope` (`webhook-envelope.lib.ts:19-21`).                                                                                                                                                                                                                                                                             |

## Slice notes

### 1 — `externalKeys` on the two user events, and the pinning test (security-full proposed)

- **Preconditions the executor states in the PR body:** the Gate 1 answers it built to (option A, B or C; erasure; bar); that `getUsers` returns `metadata` on `oldUser` (`users.service.ts:59-70`, `:234`); that the delete's returned `projectUser` row carries `metadata` (`EntityRepository`/`PivotRepository` `softDelete`/`hardDelete` use `returning()`); what the reference importer writes on `userAssignments[].metadata` (`expand-cdm-sync-input.lib.ts:187`) so the row carries `legacy.id`; whether any job touches `event_log` retention (`git grep -n event_log apps/api/src/jobs`).
- **Owner files:** `packages/@grantjs/schema/src/events/event-envelope.ts` (type), `apps/api/src/lib/webhooks/webhook-redaction.lib.ts` and `webhook-envelope.lib.ts` (projection, `{ projectId }` option), `apps/api/src/services/webhook-delivery.service.ts` (pass the subscription's project), the resolver, `apps/api/src/services/users.service.ts`, `apps/api/src/services/project-users.service.ts`, `apps/api/src/repositories/project-links.repository.ts` (or `users.repository.ts`) for the membership-rows read and its port in `@grantjs/core` if the service reaches it through one, docs (`docs/core-concepts/events-webhooks-notifications.md`, `docs/core-concepts/cdm-import-export.md`), `.changeset/*.md`.
- **Tests:** the brief's unit list, the catalog-driven part 1 test, service call-order tests, and the five e2e cases (key-keyed created user, reused identity, Grant-native, two-project filtering, hard delete). E2E needs the Docker stack (`pnpm test:e2e:up`, AGENTS.md § Testing); the executor states in the PR body whether it ran.
- **Out of this slice:** the receiver; any new CDM field (option C); `tag.unlinked`; notifications.
- **Fan-out:** Verifier after the author; Security reads the resolver and the projection line by line (what can reach the body, and for which subscription), and the e2e assertions on the serialised body.

## Out of this stack

| Item                                                                  | Why it stays out                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Receiver changes** (read the field, resolve removals and deletions) | A follow-up in the receiver's repository once v1.20.2 is released and pinned.                   |
| **A first-class CDM external-id field** (option C)                    | A separate story on the forward-import path; this story reads what the importer already writes. |
| **Backfilling markers on rows imported before grant #568**            | A re-import writes them (idempotent); no migration here.                                        |
| **`user.sessions_revoked` `before`, `tag.unlinked` `before`**         | Brief non-goals; both stay as they are, listed as exceptions in the pinning test.               |
| **Keys on other user-bearing events**                                 | Brief non-goal; the two events the requester named.                                             |

## Dependencies / notes

- **Depends on v1.20.1 on `main`** (`4f9446f4`). Grant #568 (membership-row marker) is already in it.
- The resolver and the projection filter are written together: the filter is the tenancy control, the resolver is the privacy control, and neither is safe alone.
- **Test infrastructure:** e2e needs the Docker stack; unit tests run anywhere. State in the PR body which suites ran; service workflows filter on `branches: [main]` / `feat/**`, so check `gh pr checks <n>` rather than assuming.
- **No customer tenant names** in plans, fixtures, PRs or docs; fixtures use synthetic keys and addresses on `example.com`.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Release: `chore: version packages` → **v1.20.2**; then the receiver pins it (its own procedure).

## Human gates

- [x] Gate 1: Story brief approved — Alejandro (five questions in the brief). **Approved by Alejandro on 2026-10-29: decisions (1) B — marker, then `cdmSource.legacy.id`, both behind an e-mail guard, nothing else read from `cdmSource`; (2) security-full on the slice; (3) `externalKeys` included on hard delete, documented as a pseudonymous source-system id; (4) rows imported before #568 accepted, the key comes from the row's `cdmSource.legacy.id`; (5) one slice.**
- [x] Gate 2: Stack plan approved — Alejandro (one slice, bar, named contracts). **Approved by Alejandro on 2026-10-29, as written (one slice, security-full).**
- [ ] Gate 3: Stack PR merged into trunk (security-full if accepted, otherwise light).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove /Users/aleheredia/workspace/worktrees/grant-platform-feat-webhook-envelope-before-ids`
- [ ] Local slice branch deleted
- [ ] Remote slice branch deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
