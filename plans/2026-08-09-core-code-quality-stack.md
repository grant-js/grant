# Stack plan — `@grantjs/core` code quality remediation

## Metadata

- **Slug**: `core-code-quality`
- **Story brief**: [`plans/2026-08-09-core-code-quality-brief.md`](./2026-08-09-core-code-quality-brief.md)
- **Findings**: [`docs/contributing/code-quality/core.md`](../docs/contributing/code-quality/core.md)
- **Status**: approved (2026-08-09, Ale Heredia)
- **Story trunk**: `feat/core-code-quality`
- **worktree_path**: not required — `git worktree list` shows only the main checkout, on `main`. The one other branch currently open (`fix/notification-role-i18n-key`, PR #238) touches `apps/api/src/lib/notifications/` and `packages/@grantjs/i18n/locales/` only — zero file overlap with this story. All slices run serially in the main checkout; see [Fan-out](#fan-out).

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [x] Architect — slices 1, 3, 6 (guardrail widening, `AGENTS.md`/dead-barrel cleanup, `CONCEPTS.md` glossary — the same role that owns `apps/api`'s own layering doc)
- [x] Senior Backend — slices 2, 4, 5 (all port/exception-signature implementation work)
- [ ] Senior Frontend
- [x] Senior QA — regression coverage for slice 2's two behavior changes; owns the residual `grant.ts`/`token-manager.ts` branch-coverage backlog noted in `core.md`'s Tier 6 (not a slice this story)
- [x] Senior Security — slice 2 only, blocking, independent of the slice's author
- [x] Verifier — after every slice: `pnpm --filter @grantjs/core exec tsc --noEmit`, `lint`, `test`; plus `pnpm --filter grant-api exec tsc --noEmit` on every slice (every port/exception change here is consumed by `apps/api`), plus the specific `apps/api` unit tests named in slice 2

## Ordered slices (PRs)

| #     | Branch                                      | Base                     | Concern                                                                                                                                                                      | Owner role     | Review bar        | Fan-out                                                                                                                                                                                        |
| ----- | ------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `feat/core-code-quality-guardrails`         | `feat/core-code-quality` | ESLint DAG-boundary rule + `dead-code:core` CI/pre-push wiring                                                                                                               | Architect      | light             | Independent of every other slice (root config files only). Runs first per the rubric's own rule — "widening a guardrail is the first slice of a pass, not the last"                            |
| 2     | `feat/core-code-quality-exceptions`         | slice 1                  | `GrantException` fixes: 0.1 (`NotFoundError`), 2.2 (`this.name` mechanical), 3.5 (`AuthorizationError` reorder) + 3 `apps/api` call sites                                    | Senior Backend | **security-full** | Independent of slices 3–6 (disjoint files: `errors/grant-exception.ts` + 2 `apps/api` authorization files). Security's review must be a separate read-only pass, not the author's own evidence |
| 3     | `feat/core-code-quality-dead-surface`       | slice 2                  | Delete `ports/service.port.ts`; drop `AAL_RANK`'s `export`; fix `AGENTS.md`'s `IStorageAdapter`/`IEmailAdapter` names and drop its `service.port.ts` maintenance instruction | Architect      | light             | Independent of 1–2 and of 4–6. Parallel-safe; **default: serial**                                                                                                                              |
| 4     | `feat/core-code-quality-grant-service`      | slice 3                  | Delete `types/index.ts`'s `GrantService`; repoint 3 `core/*.ts` files + 3 test files to `IGrantService`                                                                      | Senior Backend | light             | Independent of every other slice. Parallel-safe; **default: serial**                                                                                                                           |
| 5     | `feat/core-code-quality-type-consolidation` | slice 4                  | 3.1 `WebhookDeliveryPage` import swap; 3.2 `DeleteParams` de-duplication (9 external + 8 internal usages repointed)                                                          | Senior Backend | light             | Independent of every other slice. Parallel-safe; **default: serial**                                                                                                                           |
| 6     | `feat/core-code-quality-glossary`           | slice 5                  | `CONCEPTS.md`: 5.1 member/user port-layer citation, 5.2 `get`/`find` naming-convention entry                                                                                 | Architect      | light             | Independent of every other slice; docs-only. Sequenced last per pass-2 precedent — may reference decisions/files touched by earlier slices when writing them down                              |
| final | `feat/core-code-quality`                    | `main`                   | integration                                                                                                                                                                  | Principal      | deep              | —                                                                                                                                                                                              |

### Fan-out {#fan-out}

Every slice is genuinely file-independent — none shares a file with another (slice 1 is the only one touching root-shared config, and nothing else touches those same files). The decision to run them serially anyway is the same single-reviewer-bandwidth call pass 1 and pass 2 both made: with one human doing async light review, parallel slices compete for review attention and create rebase churn for no measurable gain on a story this size. If a second Backend implementer becomes available mid-story, slices 3–6 can be pulled out of the linear `gh stack` chain and opened directly against `feat/core-code-quality` in a second worktree.

The one fan-out that **is** load-bearing: slice 2's Security review must be a separate pass by Senior Security, not evidence the Backend author gathers about their own fix — same rule pass 2's slice 1 (and pass 1's `CacheHandler` slice) had to enforce. It must complete before slice 2 merges, not fold into the story→`main` gate 4 review where a BLOCK verdict would arrive after four more slices have stacked on top of it.

## Stack setup

```sh
git switch -c feat/core-code-quality main && git push -u origin feat/core-code-quality
gh stack init --base feat/core-code-quality \
  feat/core-code-quality-guardrails \
  feat/core-code-quality-exceptions \
  feat/core-code-quality-dead-surface \
  feat/core-code-quality-grant-service \
  feat/core-code-quality-type-consolidation \
  feat/core-code-quality-glossary
gh stack submit     # opens the linked PRs
gh stack sync       # restack after an upstream slice merges
```

Root the stack on `feat/core-code-quality`, never on `main` — omitting `--base` targets `main` directly and skips gate 4 (see [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking)).

---

## Slice detail

### 1 — Guardrails: DAG-boundary ESLint rule + `dead-code:core`

**Scoped to `packages/@grantjs/core/**` only, not all of `packages/@grantjs/*`** — this pass only audited `core`; widening the guardrail past what was actually audited risks flagging a legitimate import pattern in a sibling package this pass never looked at (e.g. `@grantjs/server` is a standalone SDK with its own dependency shape). Each future package pass widens the guardrail to itself, per the rule pass 1 and pass 2 both followed.

Add a `files: ['packages/@grantjs/core/src/**']` block to `eslint.config.mjs` (same pattern as the existing `apps/api/**`/`apps/web/**` blocks) with `no-restricted-imports` banning `@grantjs/cache`, `@grantjs/storage`, `@grantjs/email`, `@grantjs/jobs`, `@grantjs/logger`, `@grantjs/errors`, `@grantjs/database` — the boundary is 100% clean today (`core.md`'s lens-1 finding), so this rule should pass with zero fixes required on landing; if it doesn't, stop and report back rather than "fixing" a violation this plan didn't anticipate.

Add `"dead-code:core": "knip --workspace packages/@grantjs/core"` to root `package.json` alongside `dead-code:api`/`dead-code:web`, wire it into `.github/workflows/ci.yml` next to the existing `dead-code:*` steps, and into `.husky/pre-push`'s chain. `knip.json` already has a `packages/@grantjs/*` workspace entry configured — this slice is wiring, not new config.

### 2 — `GrantException` fixes · security-full

All three changes live in [`src/errors/grant-exception.ts`](../packages/@grantjs/core/src/errors/grant-exception.ts) — one PR, one security review covers all three:

- **0.1** — `NotFoundError`'s constructor: change `id ? ... : ...` to `id !== undefined ? ... : ...` so an explicit empty-string id is distinguishable from no id at all. Update `src/errors/grant-exception.test.ts`'s `'DEFECT CANDIDATE: ...'` test (currently uncommitted in the working tree, written during the audit) to assert the corrected behavior instead of pinning the bug — rename the test to describe the fixed behavior, not the defect.
- **2.2** — every subclass's `this.name = 'X'` line is deleted; the base `GrantException` constructor sets `this.name = new.target.name;` once.
- **3.5** — `AuthorizationError`'s constructor signature changes from `(message = 'Forbidden', reason?, originalError?, metadata?)` to `(message = 'Forbidden', reason?, metadata?, originalError?)`, restoring "originalError last" to match all 12 other subclasses. Update the 3 real call sites in the same commit: [`apps/api/src/lib/authorization/mfa-graphql-guard.ts:65`](../apps/api/src/lib/authorization/mfa-graphql-guard.ts) and [`min-aal-at-login.ts:91,198`](../apps/api/src/lib/authorization/min-aal-at-login.ts) — all three currently pass `undefined` as the 3rd positional argument to reach `metadata`; after the reorder they pass `metadata` directly and drop the placeholder.

**Test the call-site changes, not just the constructor.** `apps/api/tests/unit/lib/authorization/min-aal-at-login.test.ts` already exists and covers 2 of the 3 call sites — run it and update any assertion that inspects `AuthorizationError`'s constructed shape positionally. `mfa-graphql-guard.ts` has no dedicated test file today; add one, or extend the nearest existing MFA-guard test, asserting the thrown `AuthorizationError`'s `reason`/`metadata` land correctly post-reorder — a constructor-signature change with no test on its call site is exactly the kind of thing this rubric's lens 7 exists to catch before it ships, not after.

**Review**: Senior Security reviews independently of the Backend author. Blocking — this touches the exception class used across every AAL/MFA enforcement path in `apps/api`, even though the change itself is non-behavioral (same values, new positions, message-text change on an already-latent path).

### 3 — Dead surface + `AGENTS.md` corrections

- Delete [`ports/service.port.ts`](../packages/@grantjs/core/src/ports/service.port.ts) — zero importers, unreachable via `package.json`'s `exports` map, already missing 21 of 79 interfaces it claims to mirror (verified dead, not just unused per `core.md`'s [4.1](../docs/contributing/code-quality/core.md#41-portsserviceportts-is-entirely-unreachable)).
- Drop the `export` keyword on `AAL_RANK` in [`core/aal.ts:8`](../packages/@grantjs/core/src/core/aal.ts) — used only within its own file.
- In `AGENTS.md`: replace `IStorageAdapter` → `IFileStorageService` and `IEmailAdapter` → `IEmailService` in the domain-ports list; delete the workflow-step-4 sentence instructing contributors to maintain `ports/service.port.ts` (the file this slice deletes).

Small, mechanical, no behavior change — one PR, one Architect reviewer, light bar.

### 4 — `GrantService`/`IGrantService` consolidation

Delete `GrantService` from [`types/index.ts:197-236`](../packages/@grantjs/core/src/types/index.ts). Repoint its 3 internal consumers — [`core/grant.ts:14,30`](../packages/@grantjs/core/src/core/grant.ts), [`token-manager.ts:10,31`](../packages/@grantjs/core/src/core/token-manager.ts), [`permission-checker.ts:12,21`](../packages/@grantjs/core/src/core/permission-checker.ts) — to import `IGrantService` from `../ports/services/grant.service.port` instead, and update their 3 corresponding `.test.ts` files' imports the same way. No signature change (the two interfaces are already identical, just declared twice); this is a rename, not a redesign. Verify `apps/api/src/services/grant.service.ts`'s `GrantService` class still satisfies the target type — it already does structurally, `IGrantService` isn't a new shape.

### 5 — Type consolidation: `WebhookDeliveryPage` + `DeleteParams`

- [`ports/services/webhook-subscription.service.port.ts:23-27`](../packages/@grantjs/core/src/ports/services/webhook-subscription.service.port.ts) — delete the local `WebhookDeliveryPage` declaration, import the codegen'd type of the same name from `@grantjs/schema` instead.
- [`ports/services/user.service.port.ts:47-49`](../packages/@grantjs/core/src/ports/services/user.service.port.ts) — delete the `DeleteParams` declaration mislabeled `// Shared`; repoint its 9 external importers (`group`, `tag`, `role`, `resource`, `project-app`, `project`, `permission`, `account`, `organization` service ports) and 8 internal usages to `../repositories/common`, matching how `SelectedFields<T>` in the same file is already imported correctly by all 11 of its consumers.

Two unrelated concerns bundled into one PR because both are the same shape of fix (delete a duplicate type declaration, repoint imports to the canonical one) with no behavior change — a single reviewer pass covers both efficiently.

### 6 — `CONCEPTS.md` glossary updates

- Append the port-layer citations (`IOrganizationUserService`/`IOrganizationMemberService`, `IOrganizationUserRepository`/`IOrganizationMemberRepository`) to the existing [§ Organization member](../CONCEPTS.md) table — additive evidence for an already-recorded divergence, not a new entry.
- Add a new entry to [§ Naming conventions](../CONCEPTS.md) recording `get<Entity>By<Field>` = primary-key/canonical/list lookup and `find...By...` = secondary-key/nullable lookup as the intended (83%-followed) distinction, citing `core.md`'s [Tier 5 finding](../docs/contributing/code-quality/core.md#getbyx-vs-findbyx-for-the-identical-semantic-operation--one-convention-mostly-unfollowed) (54 vs. 11 methods). No method renamed this story — CONCEPTS.md itself says renames are a separate, later decision once the term is settled.

Documentation-only, no production code changes — an acceptable slice outcome per pass 2's slice 7 precedent.

---

## Judgment calls for gate 2 {#judgment-calls}

Flagging these for the human reviewer before implementation starts — none contradict the brief, but each is a call made filling in a gap the brief left to stack-planning time:

1. **The `I*TagRepository` × 5 extraction (2.1) is not a slice in this plan.** The brief listed it as a non-goal pending a stack-plan-time appetite call. Decision: **defer, don't attempt this pass.** The audit sized it honestly — the only extraction that doesn't rename ~200 call sites across `apps/api` is a generic template-literal-mapped-type pattern nothing else in this codebase uses, which would be a first precedent rather than a mechanical win. Recorded as a follow-up below, not silently dropped.
2. **The guardrail in slice 1 is scoped to `packages/@grantjs/core/**` only**, not all of `packages/@grantjs/*`, even though the brief's acceptance criterion left both sizes on the table ("or `packages/@grantjs/**`, if sized generously"). Chose the narrower scope because this pass only audited `core` — widening past what was actually audited risks a false-positive block on a sibling package's legitimate import shape (e.g. `@grantjs/server`'s standalone dependency set).
3. **Slices 2's two `apps/api` call-site updates are inside this `@grantjs/core`-scoped story**, not a separate cross-package slice — both are required by the same constructor-signature change and are small (3 call sites, 2 files), so splitting them into their own slice would add process overhead without a corresponding review-bar or ownership benefit. Flagging because the brief's non-goals didn't explicitly address touching `apps/api` files, only "no `apps/api` features."
4. **Slices 3–6 are sequenced as a single linear `gh stack` chain** even though every one is file-independent of the others (see [Fan-out](#fan-out)) — the same single-reviewer-bandwidth call pass 1 and pass 2 both made, reversible mid-story if a second implementer joins.
5. **Tier 6's residual `grant.ts`/`token-manager.ts` branch-coverage gap (71.92%/70.37%) is not a slice** — `core.md` explicitly flagged it as "worth a follow-up pass," not a defect blocking this one; both files already have dedicated suites, this isn't the "zero coverage" class the brief's acceptance criteria target.

## Dependencies / notes

- No `apps/web`, `@grantjs/schema`, or database changes in this story — confirmed against the brief's non-goals. `apps/api` is touched only by slice 2's 2 call-site updates, required by the `AuthorizationError` signature change itself.
- `src/errors/grant-exception.test.ts` is uncommitted in the working tree today (written during the audit's coverage lens) and must be the first commit on **slice 2's** branch, updated in place for 0.1's corrected behavior — not slice 1's, and not lost.
- Verification per slice: `pnpm --filter @grantjs/core exec tsc --noEmit`, `pnpm --filter @grantjs/core lint`, `pnpm --filter @grantjs/core test`, **plus** `pnpm --filter grant-api exec tsc --noEmit` on every slice (every port/exception change here is consumed by `apps/api`). Slice 2 additionally runs `pnpm --filter grant-api exec vitest run tests/unit/lib/authorization`.
- Slice 1's `eslint.config.mjs`/`package.json`/`ci.yml`/`.husky/pre-push` edits touch root-shared files no other slice in this story touches — no rebase risk within this stack, but sequence-sensitive if another story's stack is touching the same files concurrently (none is, per `worktree_path` above).

## Human gates

- [x] Gate 2: Stack plan approved — 2026-08-09, Ale Heredia. Implementation may proceed.
- [ ] Gate 3: Stack PRs merged into trunk.
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` — not applicable; this story runs in the main checkout
- [ ] Local and remote slice branches deleted — after gate 4
- [ ] Stack plan status → `merged-to-main`
- [ ] Update [`core.md`](../docs/contributing/code-quality/core.md) with resolved counts, and record this pass as `Done` in the [rubric's passes table](../docs/contributing/code-quality/README.md#passes)

## Follow-ups (not blocking this story)

| Item                                                                                                                                                                                     | Why deferred                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `I*TagRepository` × 5 generic extraction (2.1)                                                                                                                                           | See [judgment call 1](#judgment-calls) — sized honestly as not a clean win this pass                             |
| Backporting the 3 missing methods to `IAccountTagRepository`/`IOrganizationTagRepository`/`IProjectTagRepository`, and adding `getProjectTagIntersection`'s missing `transaction?` param | Ships alongside the 2.1 decision above if it's ever taken, not independently                                     |
| `apps/api/src/types/common.ts`'s third `DeleteParams` declaration                                                                                                                        | Outside this pass's package boundary (`core.md` 3.2) — flagged for whoever next re-audits `apps/api`             |
| `grant.ts`/`token-manager.ts` residual branch-coverage gap (71.92%/70.37%)                                                                                                               | See [judgment call 5](#judgment-calls)                                                                           |
| Widening `eslint.config.mjs`/`dead-code:*` guardrails to `packages/@grantjs/database`, `@grantjs/schema`, adapter packages                                                               | Each is the next pass's own first slice, not this one's                                                          |
| `packages/@grantjs/server`'s independent `AuthenticationError`/`AuthorizationError`/etc. naming collision with `core`'s exception hierarchy                                              | Standalone published SDK with no dependency on `@grantjs/core`, outside this pass's DAG (`core.md` Tier 5 aside) |
