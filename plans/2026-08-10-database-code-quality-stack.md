# Stack plan — `@grantjs/database` code quality remediation

## Metadata

- **Slug**: `database-code-quality`
- **Story brief**: [`plans/2026-08-10-database-code-quality-brief.md`](./2026-08-10-database-code-quality-brief.md)
- **Findings**: [`docs/contributing/code-quality/database.md`](../docs/contributing/code-quality/database.md)
- **Status**: merged-to-main (2026-08-14) — [#256](https://github.com/grant-js/grant/pull/256), 20 files, +1,697 −61, zero schema/column/migration changes
- **Story trunk**: `feat/database-code-quality`
- **worktree_path**: not required — no other story is in flight; `git worktree list` shows only the main checkout. All slices run serially in the main checkout; see [Fan-out](#fan-out).

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [x] Architect — slice 5 only (`AGENTS.md` DAG correction)
- [x] Senior Backend — slices 1, 4, 5
- [ ] Senior Frontend — not active; `apps/web` has zero `@grantjs/database` imports
- [x] **Senior QA — slices 2 and 3, the load-bearing role this story**
- [x] Senior Security — slices 2 and 4, blocking, independent of the slice author
- [x] Verifier — after every slice: `tsc --noEmit`, `lint`, `test`

## Ordered slices (PRs)

| #     | Branch                                      | Base                         | Concern                                                              | Owner     | Review bar        | PR                                                 |
| ----- | ------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- | --------- | ----------------- | -------------------------------------------------- |
| 1     | `feat/database-code-quality-guardrails`     | `feat/database-code-quality` | DAG ESLint rule + `dead-code:database` + drop `zod`                  | Backend   | light             | [#251](https://github.com/grant-js/grant/pull/251) |
| 2     | `feat/database-code-quality-test-harness`   | slice 1                      | Land the audit's harness + RLS/seed characterization tests           | QA        | **security-full** | [#252](https://github.com/grant-js/grant/pull/252) |
| 3     | `feat/database-code-quality-coverage`       | slice 2                      | Complete the coverage lens — seed idempotency, bootstrap, connection | QA        | light¹            | [#253](https://github.com/grant-js/grant/pull/253) |
| 4     | `feat/database-code-quality-drizzle-config` | slice 3                      | Resolve the two-config divergence                                    | Backend   | **security-full** | [#254](https://github.com/grant-js/grant/pull/254) |
| 5     | `feat/database-code-quality-docs`           | slice 4                      | `AGENTS.md` DAG, `CONCEPTS.md` citation, Tier 3 decisions            | Architect | light             | [#255](https://github.com/grant-js/grant/pull/255) |
| final | `feat/database-code-quality`                | `main`                       | integration                                                          | Principal | deep              | [#256](https://github.com/grant-js/grant/pull/256) |

¹ **Escalates to `security-full` if slice 3 surfaces a Tier 0 finding** — likeliest in seed idempotency. Decide the bar when the finding lands, don't pre-commit to `light`.

### Fan-out {#fan-out}

Slices 1, 4, and 5 are file-disjoint from each other and from 2–3. Slices 2 and 3 are genuinely dependent — slice 3 cannot start until slice 2's harness exists. Default is serial, a single-reviewer-bandwidth call consistent with passes 2 and 3.

**The one load-bearing fan-out**: slice 2's Security review must be an independent pass, not evidence the QA author gathers about their own tests. RLS is a security boundary; pass 1's `CacheHandler` slice is the precedent where an author's self-review reported clean and an independent pass on the same commit found a reachable fail-open.

**On the failed agent fan-out this pass:** the audit's three lens agents died on a session limit and lenses 1–6 were re-run inline. That is a fallback for _reading_ lenses only. Slice 3 is the executing lens and must not be compressed the same way — if agent budget is tight, run slice 3 with fewer parallel slices rather than shrinking its scope.

## Stack setup

```sh
git switch -c feat/database-code-quality main && git push -u origin feat/database-code-quality
gh stack init --base feat/database-code-quality \
  feat/database-code-quality-guardrails \
  feat/database-code-quality-test-harness \
  feat/database-code-quality-coverage \
  feat/database-code-quality-drizzle-config \
  feat/database-code-quality-docs
gh stack submit
gh stack sync   # after any upstream merge or trunk-only commit
```

Root on `feat/database-code-quality`, never `main` — omitting `--base` skips gate 4 and turns one release into five.

---

## Slice detail

### 1 — Guardrails · light

Widen pass 3's template to this package: a `packages/@grantjs/database/src/**` block in `eslint.config.mjs` banning adapter-package imports, plus `"dead-code:database": "knip --workspace packages/@grantjs/database"` wired into `.github/workflows/ci.yml` and `.husky/pre-push`.

**Prove the rule fires.** Plant a real adapter import (e.g. `@grantjs/logger`) in a `src/` file, confirm ESLint errors with the intended message, restore. Pass 3's carried-forward input: a green run on a clean tree is indistinguishable from a rule that does nothing.

**Note the allowed set is different here than for core.** This package legitimately depends on `@grantjs/core`, `@grantjs/env`, and `@grantjs/constants` — do not copy core's rule verbatim. Remove `zod` from `package.json` in this slice so `dead-code:database` lands green.

### 2 — Test harness + RLS/seed characterization · security-full

Land the audit's uncommitted work, currently 46/46 passing: `vitest.config.ts`, `src/test-support/fake-db.ts`, `src/grant-rls-login-role.lib.test.ts`, `src/scripts/seed-permissions.test.ts`, and `package.json`'s `test`/`test:coverage` scripts + `vitest` devDependency.

**Delete `probe.tmp.ts`** — scratch from the audit, must not be committed. Its one result is already recorded in the findings doc (180 permission pairs, 0 intra-group duplicates).

**Review these tests as tests, not as a formality.** They were written by an agent that did not finish and whose reasoning was not reviewed. Confirm `fake-db.ts` actually models the behavior under test rather than the behavior the test wants, and that no test can reach a live database.

Security reviews the RLS characterization independently of the author.

### 3 — Complete the coverage lens · light, escalating

The lens that found a Tier 0 bug in all three prior passes, run properly. In risk order:

- **`src/scripts/` (remaining 3 files) — idempotency is the question.** What happens on a _second_ run? Guarded by `onConflictDoNothing`/existence checks, or does it duplicate or throw? Every environment runs these; a non-idempotent seed is an operational defect.
- **`bootstrap.ts` (48 L)** — runs on API startup, so failure modes are production-facing.
- **`connection/` (85 L)** — pool construction, config defaulting, `ILogger` injection, and specifically the module-level `let connection` singleton: re-initialization returns the _existing_ connection with a warning. Characterize what that means for a caller that passes different config the second time.
- **`demo-refresh.ts` (51 L)** — destructive by name, unexamined.

**Characterize, don't fix.** Assert current behavior including anything that looks wrong; report defects for a human decision. If a Tier 0 lands, raise the bar (see footnote 1) rather than absorbing it.

**Added mid-story (2026-08-10, approved): make the seed's condition collision loud.** `seedPermissionsData` de-duplicates by `${resource}:${action}` and keeps the first-iterated mapping, discarding any other group's declared `condition` with no warning (`seed-permissions.ts:256-264`). Six pairs collide today: `ApiKey:Delete`, `ApiKey:Revoke`, `Project:Delete`, `Project:Update`, `Tag:Delete`, `Tag:Update`. The permission model cannot represent a per-group condition — `group_permissions` is a bare join table — so the seed should **say so** rather than silently picking one. Warn (do not throw: every environment runs this) and cover it with a test. This is the guardrail that would have surfaced the collision without needing a characterization test to find it.

Prefer no-live-database tests throughout — `fake-db.ts` from slice 2 exists for this. If something genuinely requires Postgres, scope it out with a reason rather than wiring testcontainers mid-story.

### 4 — Resolve the drizzle-config divergence · security-full

Two configs, non-equivalent URL resolution, on a destructive operation:

- `drizzle.config.ts` → `resolveDatabaseUrl(getEnv())`, which falls back to composing from `POSTGRES_*` parts
- `drizzle.config.cjs` → `process.env.DB_URL` alone, yielding `undefined` in exactly that fallback case

**Investigate before deleting.** `package.json`'s `files` lists only the `.ts`, nothing in-repo references the `.cjs`, and it dates to PR #20 ("Feat/deployment config"). But a config file is _auto-discovered_, not imported — grep is weak evidence here, and this is `knip`'s documented blind spot. Check `docker-compose*.yml`, the Dockerfiles, `scripts/`, and CI workflows for any `drizzle-kit` invocation that would resolve `.cjs`.

Then either delete it, or make it delegate to `resolveDatabaseUrl`. **Do not leave two divergent credential paths on `db:migrate`.**

### 5 — Docs and recorded decisions · light

- **`AGENTS.md` dependency graph**: add `@grantjs/env` (absent entirely — and `database` is its only dependent among graphed packages) and the `database → @grantjs/constants` edge. Doc correction; the code is right.
- **`CONCEPTS.md` `member`/`user`**: add the physical-table citation (`organization_users`, `organization-users.schema.ts:17`) and state the cost — with the fork now cited at API (pass 1), port (pass 3), and table (pass 4) layers, reconciling it is a migration plus a contract change. Canonical stays `member`. **No rename.**
- **Two Tier 3 decisions, recorded either way**: (a) `grant-rls-login-role.lib.ts`'s `options.env ?? getEnv()` fallback vs. `connection.ts`'s strict injection — is env-fallback the intended lib-level convenience, or should libs take config strictly? (b) the 3 tables without `deletedAt` — deliberate retention policy or drift? Write the answer down; changing code is optional.

---

## Judgment calls for gate 2 {#judgment-calls}

1. **Slice 3's bar is deliberately left conditional.** Pre-declaring `light` on the lens most likely to find a real bug would be optimistic; pre-declaring `security-full` would over-gate four probably-clean files. The bar is set when the finding lands. Flagging because it's the one slice whose review cost isn't knowable up front.
2. **The audit-log factory (Tier 2.1) is excluded entirely**, not deferred within the story. 53 tables × 18 lines diffing to 0 is the largest repetition in the package, but `drizzle-kit`'s static analysis makes it a spike with a severe failure mode (missing or destructive migration), not a refactor. If this is wanted, it needs its own brief.
3. **Slice 2 lands agent-written tests I did not author and whose reasoning died with its session.** I've scoped its review to include reviewing the tests themselves, not just running them. The alternative — rewriting them from scratch — discards 46 passing tests and a working harness for no evidenced reason.
4. **Migration SQL (2,772 lines, 30% of the unit) is out of scope.** No lens reads it; inventing one mid-story would be scope creep. Recorded as owed to a future pass, possibly as a new lens.
5. **Slice 1's allowed-import set differs from pass 3's**, because this package legitimately depends on `env` and `constants`. Copying core's rule verbatim would break the build — calling it out because it's the obvious mistake to make.

## The permission-condition collision {#condition-collision}

Surfaced by slice 2's seed characterization. Recorded here because two of its three arms leave this story as follow-ups, and the reasoning is what makes them safe to defer.

**The mechanism.** `seedPermissionsData` collapses every `${resource}:${action}` to one shared `permissions` row, keeping the first-iterated group's `condition`. It has to: `group_permissions` is a bare join table (`groupId`, `permissionId`, timestamps) with **no `condition` column**, so a per-group condition has nowhere to live. Six pairs collide today.

**It was reported first as a fail-open privilege escalation. That was wrong.** The corrected finding, in the order the evidence arrived:

1. **Nothing is more recent.** `git blame` returns one SHA — `b410d0f5` (2026-01-25, PR #7 _feat/resource-access-control_) — for all 35 lines of the `ApiKey*` mapping block and all 24 lines of the group block. `ApiKeyOwner`, `ApiKeyAdmin` and `ApiKeyDev` were written together. The condition has never been persisted, so there is no regression.
2. **The group-definition layer contradicts the condition.** The three `ApiKey*` groups declare an identical `[Create, Delete, Revoke]`, differing only in `assignedRoles`. Where the tiers actually diverge is member management: `OrganizationMemberOwner`/`Admin` hold `[Update, Remove]` while `OrganizationMemberDev` holds `[]` with no assigned roles. The hierarchy is about who you can invite and manage, not which resources you can touch.
3. **`resource.createdBy` is an outlier.** It appears exactly twice in the whole model, both in `ApiKeyDev`. Every other ownership restriction uses `resource.userId` (4 sites) or `resource.id` (2); scope restrictions use `In: { 'resource.id': '{{resource.scope.*}}' }` (4).
4. **For `ApiKey` the condition is unevaluable, so persisting it would deny everything.** The ApiKey mutations pass no `resourceResolver` (`mutations.ts:452-475`) and no ApiKey resolver exists — only `common`, `project`, `tag`, `user`. So `resolvedResource` stays null and `ConditionEvaluator.getFieldValue` short-circuits to `undefined` (`condition-evaluator.ts:51-55`); `StringEquals(undefined, userId)` never matches → denied. Had the seed persisted the condition, `OrganizationDev` could delete and revoke **nothing, not even their own keys**.

**Conclusion**: `ApiKeyDev`'s condition is dead configuration that contradicts the layer above it — not a security defect. It is still a latent trap: registering an ApiKey resource resolver later would activate it and silently break `OrganizationDev`.

**Where each arm goes:**

| Arm                                                         | Disposition                                                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seed drops conflicting conditions silently                  | **Slice 3** — warn, and test the warning                                                                                                               |
| `ApiKeyDev`'s two dead conditions                           | Follow-up — `@grantjs/constants`, changes nothing at runtime today                                                                                     |
| Project/Tag inherit `AccountProjectOwner`'s scope condition | Follow-up — Project and Tag **do** register resolvers, so this arm is live; severity unknown until `resource.scope.projects` is traced for an org role |

## Dependencies / notes

- Slice 3 **blocks on** slice 2's harness. Every other pair is file-disjoint.
- Slice 1 touches root-shared files (`eslint.config.mjs`, `package.json`, `ci.yml`, `.husky/pre-push`); no other slice in this story touches them.
- Verification per slice: `pnpm --filter @grantjs/database exec tsc --noEmit`, `lint`, `test`. Re-check `pnpm --filter grant-api exec tsc --noEmit` on any slice touching package exports.
- The uncommitted audit files must land on slice 2's branch. **Do not lose them, and do not commit `probe.tmp.ts`.**
- No schema, column, or migration changes anywhere in this story.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-08-10, Ale Heredia. Implementation may proceed.
- [x] Gate 3: Stack PRs merged into trunk — #251–#255. See the merge-topology note below.
- [x] Gate 4: Story → `main` — [#256](https://github.com/grant-js/grant/pull/256), merged 2026-08-14 (`39c792ba`).

**Merge-topology note, worth carrying to the next stacked story.** All five slice PRs merged, but only slice 1 reached the trunk. `gh stack` merges land content in each PR's own **base**, and bases do not cascade downward — so slices 2–5 accumulated on `feat/database-code-quality-drizzle-config` while the trunk still pointed at slice 1. Fixed by merging that tip into the trunk explicitly (`--no-ff`) before opening #256. **Verify the trunk actually contains every slice before gate 4**; a green gate-4 run on a trunk missing four slices would have been green for the wrong reason.

Gate-4 integration verification, on the assembled trunk with `main` merged in: `type-check` 0 errors · `lint` 0 · `build` 11/11 · `CI=1 pnpm test` 10/10 · `format:check` 0 · `dead-code:{api,web,core,database}` all 0. Plus two checks only meaningful once assembled: the new DAG rule still errors on a planted `@grantjs/logger` import, and `drizzle-kit generate` resolves `drizzle.config.ts` with **79 migrations before and after** the `.cjs` deletion.

No changeset — `@grantjs/database` is in `.changeset/config.json`'s `ignore` list and nothing else in this story is a published package.

## Cleanup

- [x] `git worktree remove` — not applicable
- [x] Local and remote slice branches deleted — 2026-08-14
- [x] Stack plan status → `merged-to-main`
- [x] Update [`database.md`](../docs/contributing/code-quality/database.md) with resolved counts and record pass 4 as `Done` in the [rubric's passes table](../docs/contributing/code-quality/README.md#passes)

## Follow-ups (not blocking this story)

**Closed by [`plans/2026-08-14-database-cq-followups-stack.md`](./2026-08-14-database-cq-followups-stack.md)** — actionable backlog from [`database.md` § Backlog](../docs/contributing/code-quality/database.md#backlog). Remaining items there are owed to later passes (migration SQL lens, audit-log factory spike, unread-table method, guardrail widening, rubric SQL under-count).
