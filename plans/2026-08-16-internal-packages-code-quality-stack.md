# Stack plan — internal `@grantjs/*` packages code quality remediation

## Metadata

- **Slug**: `internal-packages-code-quality`
- **Story brief**: [`plans/2026-08-16-internal-packages-code-quality-brief.md`](./2026-08-16-internal-packages-code-quality-brief.md) — approved 2026-08-16, Ale Heredia
- **Findings**: `docs/contributing/code-quality/internal-packages.md` — written by slice 8
- **Status**: `merged-to-main` — all eight slices merged to trunk (#279, #281, #283, #284, #285, #286, #287, #288), then the trunk merged to `main` as [#289](https://github.com/grant-js/grant/pull/289) (`316b7a85`, 2026-08-18). Both gates cleared; pipeline green.
- **Was**: in-progress — gate 2 cleared 2026-08-16; slices land one at a time; all eight branches declared in one `gh stack init`, then `gh stack submit --auto` + `gh stack link` after each. GitHub stack: [#282](https://github.com/grant-js/grant/stacks/282)
- **Story trunk**: `feat/internal-packages-code-quality`
- **worktree_path**: **not required** — no other story is in flight. `git worktree list` shows only the main checkout. Slices run serially in the main checkout, as in passes 4 and 5. Add a worktree only if a second story opens mid-stack.
- **Base**: `main` at `178dd710` (pass 5, #275). Every `file:line` citation in this plan and the brief re-verifies against this commit.
- **Pass**: 6 of the [code quality passes](../docs/contributing/code-quality/README.md)

### One parallel branch, no collision

`docs/close-out-pass-5` carries the pass-5 close-out (gate 4, status, correction C4) and touches only `docs/contributing/code-quality/schema.md` and `plans/2026-08-16-schema-code-quality-stack.md`. **No file in this stack overlaps it.** The brief's link to C4 resolves once both land; merge order between them does not matter.

## Active roles

- [ ] Project Manager — gate decisions, slice 8
- [ ] Principal Engineer — stack order, integration
- [ ] Architect — slice 2 only (the `AGENTS.md` package-graph correction)
- [ ] Senior Backend — slices 2, 4, 5, 6, 7
- [ ] **Senior QA — slice 3, the load-bearing role this story**
- [ ] Senior Security — slice 3, blocking, independent of the slice author
- [ ] Verifier — after every slice: `type-check`, `lint`, `dead-code:*`, tests, plus `tsc --noEmit` on `grant-api`, `grant-web`, **and `grant-config`**
- [ ] ~~Senior Frontend~~ — **not active.** Of the 12 packages, only `constants` and `i18n` reach `apps/web`, and neither changes in a way that reaches the UI

## Ordered slices (PRs)

| #     | Branch                                       | Base                                  | Concern                                                                                              | Owner          | Review bar         |
| ----- | -------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------- | ------------------ |
| 1     | `feat/internal-packages-cq-platform-removal` | `feat/internal-packages-code-quality` | Delete `@grantjs/platform` whole — **done, committed `7865a712`**                                    | Backend        | light              |
| 2     | `feat/internal-packages-cq-guardrails`       | slice 1                               | ESLint DAG rules ×12 + **9 missing lint scripts** + `dead-code` + `AGENTS.md` graph + **one Tier 0** | Backend + Arch | light              |
| 3     | `feat/internal-packages-cq-tests`            | slice 2                               | Lens 7 as detector — `webhooks` SSRF + signer first, then factories                                  | **QA**         | light, escalating¹ |
| 4     | `feat/internal-packages-cq-error-vocabulary` | slice 3                               | 14 raw `throw new Error` → domain errors; `env` exemption                                            | Backend        | light              |
| 5     | `feat/internal-packages-cq-noop-logger`      | slice 4                               | One `noopLogger` export from `core`; 6 sites collapse                                                | Backend        | light              |
| 6     | `feat/internal-packages-cq-dead-surface`     | slice 5                               | The 89, split by edit class; two rule-7 ambiguities resolved first                                   | Backend        | light              |
| 7     | `feat/internal-packages-cq-build-config`     | slice 6                               | `tsconfig.build.json` dialects + the `database` test-support leak                                    | Backend        | light, artifact²   |
| 8     | `feat/internal-packages-cq-docs`             | slice 7                               | `internal-packages.md`, pass table, carried inputs                                                   | Arch + PM      | light              |
| final | `feat/internal-packages-code-quality`        | `main`                                | integration                                                                                          | Principal      | **deep**           |

¹ **Escalates to `security-full` if the SSRF or signer tests find a bypass.** Unlike pass 5's withdrawn footnote — which hedged against something `tsc` already enforced — this one guards real untested code with no compiler check anywhere near it. Do not withdraw it without running the tests first.

² Not a bar, a **blocking Verifier step**: list `dist/` contents after a production build. See slice 7.

The story→main bar is `deep`: this stack deletes a package, changes what ships in the production image, and touches all 12 remaining internal units.

### Ordering rationale

Driven by **what verifies what**, not by layer order:

- **Slice 1 before the guardrails, which inverts the rubric's stated rule — deliberately.** `README.md:199` says widening a guardrail is the first slice of a pass. The reason it gives is sizing: run the tool early so you know the unit's true size before writing a finding. That reason does not apply to `platform`, which was fully measured at gate 1 (28 lines, 0 importers, decided). Writing an ESLint DAG rule and a `dead-code` entry for a package that is about to be deleted is work the next slice would immediately undo. **The rule's purpose is served, its letter is not** — recorded here rather than silently deviated from.
- **Slice 2 before everything else.** Once `platform` is gone, the guardrail slice sees the final package set and writes 12 rules, not 13.
- **Slice 3 before slices 4–6.** Lens 7 is a **detector** here, not a backlog item — pass 1's untested base classes produced three Tier 0 findings. If the SSRF guard has a bypass, that changes what slices 4–6 are allowed to touch and may open its own story. Testing after refactoring inverts the evidence.
- **Slice 5 after slice 4**, and both after 3. They are file-disjoint from each other (`jobs`' raw throws are in `types.ts`, `registry.ts`, `bullmq/index.ts`, `node-cron/index.ts`; the `noopLogger` sites are in `factory.ts` and `base/job.ts`) but both touch `jobs`, and serial keeps each diff single-concern.
- **Slice 6 after slice 5.** They collide: the dead-surface slice drops `export` from config types declared in the same `factory.ts` files the `noopLogger` slice edits. Serial, not fan-out.
- **Slice 7 last before docs.** It is file-disjoint from everything (only `tsconfig.build.json` files) and it is the one slice whose failure mode is invisible to `tsc` — isolating it keeps that review honest.

### Fan-out

**Default is serial**, consistent with passes 2–5 and single-reviewer bandwidth.

**The one load-bearing fan-out**: slice 3's Security review must be an independent pass, not evidence the QA author gathers about their own tests. `webhooks/src/ssrf.ts` is a guard against server-side request forgery and `signer.ts` generates webhook signatures; both have zero tests today. The question for Security is not "do these tests pass" but "what does the guard fail to catch, and does a test encode the bypass as correct behaviour." **Characterize first** — assert what the code does today including what looks wrong, then classify each as defect or intended, separately.

Slice 7 is file-disjoint from 2–6 and could fan out; it is kept serial because its verification (a production build + `dist/` listing) is the slowest step in the stack and is easier to attribute when nothing else is in flight.

## Stack setup

```sh
git switch -c feat/internal-packages-code-quality main && git push -u origin feat/internal-packages-code-quality
# All eight named up front — init adopts what exists and creates the rest.
gh stack init --base feat/internal-packages-code-quality \
  feat/internal-packages-cq-platform-removal \
  feat/internal-packages-cq-guardrails \
  feat/internal-packages-cq-tests \
  feat/internal-packages-cq-error-vocabulary \
  feat/internal-packages-cq-noop-logger \
  feat/internal-packages-cq-dead-surface \
  feat/internal-packages-cq-build-config \
  feat/internal-packages-cq-docs
gh stack submit --auto   # after each slice; --auto is required in a non-TTY
# submit --auto does NOT create the GitHub stack when the PRs already exist.
# link does, and is safe to re-run with the growing PR list after every slice:
gh stack link --base feat/internal-packages-code-quality 279 281   # bottom to top
gh stack sync            # after any upstream merge or trunk-only commit
```

Confirm the stack is actually on GitHub — `gh stack view` renders the local tree whether or not it exists remotely, so it is not the check:

```sh
gh pr view <bottom-pr> --json baseRefName   # must be the trunk
```

Root on `feat/internal-packages-code-quality`, never `main` — omitting `--base` skips gate 4 and turns one release into eight. The same applies to `gh stack link` if PRs are adopted mid-flight.

### Declare every slice branch in `gh stack init`, up front {#gh-stack-usage}

`gh stack init` **adopts existing branches and creates missing ones** — that is why passes 1–5 list all slice branches in one `init`, before any of them exists. Do the same here. The stack is then complete from the start and each slice is worked in place.

**Three operational notes, each learned by getting it wrong at slice 2:**

- **`gh stack submit` is interactive by default.** It opens a single-screen editor and will simply hang in a non-TTY (an agent shell, CI). Use **`gh stack submit --auto`**, which skips the editor, creates new PRs as drafts, and silently skips branches with no commits.
- **`--auto` does _not_ create the GitHub Stack object when every PR already exists.** It reports `PR #N … is up to date` and exits 0 having done nothing — local tracking looks right, `gh stack view` renders the tree, and **`/pulls` shows no stacking at all**. Creating the stack from already-open PRs is the editor's `Ctrl+B` action, which `--auto` has no equivalent for. **Use `gh stack link` instead — it is the only non-interactive way to create or grow the stack on GitHub:**

  ```sh
  gh stack link --base feat/<slug> <pr> <pr> …   # bottom to top; --base is mandatory
  ```

  `link` needs no local tracking state, creates the stack if absent, and **adds to an existing stack without removing anything** — so it is the per-slice command: re-run it with the full PR list each time a slice opens its PR.

- **`gh stack add` is for a branch that does not exist yet.** It creates a branch on top of the current stack; it cannot adopt one you already built with `git switch -c`. If every branch was declared in `init`, `add` is not needed at all.

Recovering a stack that was initialised with too few branches: `gh stack unstack` (drops local tracking, and the GitHub stack if one exists), then re-run `gh stack init --base <trunk>` with the **full** branch list, then `gh stack link --base <trunk> <prs…>`.

**`gh stack unstack` deletes the GitHub stack.** If it prints `Stack has no remote ID — skipping server-side unstack`, no stack existed there to begin with — which is itself the signal that a previous `submit` created PRs but never stacked them.

Verify after every slice — the bottom PR's base is the only one that can be silently wrong, and nothing warns you:

```sh
gh pr view <n> --json number,baseRefName,headRefName
```

---

## Slice detail

### 1 — Delete `@grantjs/platform` · light · **done**

Committed as `7865a712`. 5 files, 74 deletions: the package directory and its `pnpm-lock.yaml` entry. Nothing relocated; the reasoning is in the [brief](./2026-08-16-internal-packages-code-quality-brief.md#platform) and the commit message.

**Verification already run** (pass 5's C3 applied — no existence check piped through `head`):

- `git grep "@grantjs/platform"` across every tracked file type returned only the package's own `package.json` and the lockfile entry
- No script asserts a package count; the root `tsconfig.json:23` alias is the wildcard `"@grantjs/*"`, not a `platform` entry
- All **15** `WORKSPACE_PACKAGES` in `scripts/docker/build-api-production.mjs` still resolve **with their `tsconfig.build.json` present** — the precondition whose absence broke pass 5's e2e stage
- `tsc --noEmit` clean on `grant-api`, `grant-web`, `grant-config`, run **directly** rather than through turbo, which reported `FULL TURBO` cache hits and would have proven nothing

**One finding recorded, not fixed**: `apps/api/src/server.ts:118,125` mounts `/api` and `/graphql`; `apps/web/next.config.ts:20-22` proxies to them; nothing enforces agreement. Slice 8 writes it up; fixing it is its own story.

### 2 — Guardrails · light

The rubric's highest-value output, and the one slice whose result outlives every finding in the pass.

**a. ESLint DAG rules for all 12.** Add per-package `files` scopes to `eslint.config.mjs`, alongside the existing blocks at `:378` (`core`), `:401` (`database`), `:415` (`schema`).

**Derive each package's allowed set from its own `package.json` `dependencies`.** This is pass 4's carried input and it has now cost two passes: copying `core`'s rule into `database` broke the build because `database` legitimately depends on `env` and `constants`. The 12 are not one rule applied twelve times:

| Allowed to import | Packages                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `core` only       | `cache` `storage` `email` `logger` `errors` `telemetry` `analytics` `webhooks` `constants` |
| `core` + `schema` | `jobs`                                                                                     |
| **nothing**       | `env` `i18n`                                                                               |

`noAdapterImports(pkg)` at `eslint.config.mjs:26` is a starting point, not the rule. Note `constants` is _not_ an adapter but sits at the same DAG level, and `env`/`i18n` take the `schema`-style pattern ban (`@grantjs/*` outright) since they depend on nothing.

**Prove every rule fires.** Twelve rules, twelve planted violations, twelve confirmed errors, then restore. Pass 3's carried input: a guardrail that passes is not a guardrail that works, and a green run on a clean tree is indistinguishable from a rule that does nothing. This is the slice's largest time cost and it is not optional.

**b. `dead-code` coverage.** Extend `package.json:21-25` and the CI/pre-push chains (`ci.yml:105-117`, `.husky/pre-push:2`). Twelve more `dead-code:<pkg>` scripts is noise — prefer one `dead-code:packages` covering the set, and say in the findings doc which shape was chosen and why.

**State the blind spot next to whatever it reports.** `knip.json`'s `packages/@grantjs/*` block sets `entry: ["src/index.ts"]`, so every barrel re-export counts as used and knip reports zero unused exports here **by construction**. Its zero is "not measurable this way," not "clean" — which is exactly why slice 6's 89 came from cross-referencing consumers instead.

**c. `AGENTS.md` package graph — Architect.** Correct the 11-package graph to the real **18** (post-`platform`), distinguishing the three classes and naming the publishable set. Deriving the rules in (a) _is_ deriving the graph, which is why this is not the separate doc story pass 5 proposed — doing it separately writes the same graph twice.

### 3 — Coverage as a detector · light, escalating

**The load-bearing slice.** Zero tests across 12 packages and ~6,312 lines. Unlike pass 5 — where the honest reading was that the unit-testable surface was near zero — this surface is genuinely testable.

**Order within the slice matters. Security-weighted files first:**

0. **`telemetry/src/cloudwatch.ts` — a regression test for [C3](#corrections), owed by slice 2.** Assert the adapter can obtain its client (i.e. the module loads under ESM) and that `sendLog` does not throw `ReferenceError`. This is the highest-value single test in the pass: the defect it pins shipped undetected through five code-quality passes because nothing linted, tested, or executed the package.
1. **`webhooks/src/ssrf.ts`** — the SSRF guard. `ssrf.ts:123` already has an `addresses.length === 0` branch worth characterizing. Cover: literal IPs across every private range, DNS names resolving to private addresses, IPv6 and IPv4-mapped IPv6, redirects, and decimal/octal/hex IP encodings.
2. **`webhooks/src/signer.ts`** — signature generation. Cover the scheme constant, payload canonicalization, and timing-safe comparison if one is claimed.
3. **Provider-selection branches** of the 6 static factories + `createWebhookAdapters` — each `switch` arm and each `default`, which is where a misconfigured provider silently falls back.
4. **Pure functions**: `i18n/src/validation-keys.ts`, `constants`' `isDefaultResourceAction`, `canAssignRole`.

**Do not pad this slice with tests for `as const` arrays.** Pass 5's discipline holds: a coverage number with no information in it is worse than an honest zero.

**Two carried inputs bite here.** **Mutation-check every test before counting it** (pass 4) — a characterization test that has never failed characterizes nothing; mutate the code, confirm red. And include `vi.clearAllMocks()` in `beforeEach` wherever a spy is used: `vi.spyOn` on an already-spied method returns the _existing_ spy, and pass 4 saw 150 recorded calls where 6 were expected, with assertions silently reading other tests' calls.

**Write count assertions as pins, not floors** (pass 5) — `toBeGreaterThanOrEqual` absorbs exactly the drift the test exists to catch.

**Escalation is real, not ceremonial.** If characterizing the SSRF guard surfaces a bypass, that is a Tier 0 finding: the slice escalates to `security-full`, Security reviews independently, and the fix may leave this stack entirely.

### 4 — Error vocabulary · light

14 raw `throw new Error` against 43 domain-error throws in the compliant packages. `AGENTS.md` § Error handling requires domain-specific errors.

- **`jobs` — 10.** Four `Job ${jobId} not found` (`bullmq/index.ts:178,193`, `node-cron/index.ts:94,109`) → `NotFoundError`; three `already registered`/`already scheduled` (`registry.ts:41`, `bullmq/index.ts:69`, `node-cron/index.ts:28`) → `ConflictError`; three scope-validation throws (`types.ts:33,37,40`) → `ValidationError`.
- **`constants` — 3.** `permissions/groups.ts:659`, `permissions/i18n-helpers.ts:25`, `permissions/resources.ts:182`, all `NotFoundError`-shaped. `constants` already imports `core`, so this costs no new dependency.
- **`env` — 1, and it is a decision, not a fix.** `env/src/load-env.ts:24` throws raw because `@grantjs/env` declares **no `@grantjs/*` dependency at all**. Complying means adding `core` to the one package deliberately kept dependency-free. Per lens 2, an unfollowable rule is a Tier 0 finding **against the rule**. Record the exemption in `AGENTS.md` with its reason, or accept the dependency — but decide it, do not quietly convert it.

**Check for behavioural change before converting.** These throws cross a package boundary into `apps/api`; anything catching on `instanceof Error` still works, but anything matching on `.message` or on the absence of a `code` may not. Grep the catch sites.

### 5 — `noopLogger` de-duplication · light

An 11-line `noopLogger: ILogger` block, byte-identical **including its comment**, at 6 declaration sites in 5 packages: `cache/src/factory.ts:7-17`, `storage/src/factory.ts:16-26`, `email/src/factory.ts`, `webhooks/src/factory.ts`, `jobs/src/factory.ts`, `jobs/src/base/job.ts`.

**Sized at the call site per rule 6**, which is what makes this the one extraction in the pass that survives being opened: the call site is `loggerFactory?.createLogger(…) ?? noopLogger` before and after, with `noopLogger` imported rather than declared. **~66 lines removed, 6 call sites unchanged, one new export.**

Export it from `@grantjs/core` — it owns `ILogger`, and all 5 packages already depend on core, so this adds **no edge to the DAG** and slice 2's new rules permit it. Verify that: the rules must not reject the very import this slice adds.

`AGENTS.md` § Logging already describes the no-op fallback as the intended pattern; this makes the described pattern the actual one.

### 6 — Dead surface · light

**89 exported symbols with no reference outside their own package**, per-package: `constants` 23, `email` 11, `errors` 8, `jobs` 7, `storage` 6, `telemetry` 5, `analytics` 5, `webhooks` 5, `logger` 4, `cache` 3, `env` 3, `i18n` 2. (`platform`'s 7 left with slice 1.)

**Split the diff by edit class (rule 4), so the risky group is reviewable alone.** Reported as one number a slice looks far more dangerous than it is, and the safest, largest group disappears into it:

1. **Drop the `export` keyword** — adapter implementations and their config types, constructed only by their own factory: `RedisCacheAdapter`, `S3StorageAdapter`, `LocalStorageAdapter`, `SmtpEmailAdapter`, `SesEmailAdapter`, `MailgunEmailAdapter`, `MailjetEmailAdapter`, `ConsoleEmailAdapter`, `BullMQJobAdapter`, `NodeCronJobAdapter`, `CloudWatchTelemetryAdapter`, `UmamiAnalyticsAdapter`, `HttpWebhookDeliveryAdapter`, and the `*Config`/`*Provider`/`*FactoryConfig` types beside them. **Zero behaviour change** — the export is the accident, the port pattern is working.
2. **Delete the declaration** — only after (3) resolves.

**Two rule-7 ambiguities must be resolved _before_ anything in them is deleted.** An unused symbol reports identically whether it was superseded or whether its call site is missing everywhere:

- **`@grantjs/errors`' 8 `Http*` subclasses** (`http-exception.ts:43-94` plus `HttpExceptionOptions`). `apps/api/src/lib/errors/index.ts` re-exports the package wholesale; the API uses `mapDomainToHttp()` in 3 files and the subclasses in **exactly 0**. Superseded vocabulary, or the vocabulary the HTTP layer should be using and isn't? The answer decides between "delete 8 classes" and "`apps/api` has a gap" — and the second is a finding about `apps/api`, recorded not actioned.
- **`constants`' account-tier role vocabulary.** `ACCOUNT_ROLES` (`permissions/roles.ts:20`), `ACCOUNT_ROLE_DEFINITIONS` (`:22`) and `ORGANIZATION_ROLES` (`:33`) have zero external references while `ORGANIZATION_ROLE_DEFINITIONS` (`:40`) has two. An asymmetry inside one file, in the package that defines the permission model, is more likely an unbuilt tier than clutter — and if so it is a finding about the product, not the code. **`constants` reaches `apps/web` and the permission model is security-relevant**; if the resolution is "unbuilt tier," nothing is deleted in this pass.

### 7 — Build configuration · light, with a blocking artifact check

Carried in from pass 5, corrected at its close-out ([C4](./2026-08-16-schema-code-quality-stack.md#c4--the-test-support-leak-fix-does-not-live-in-the-shared-parent-close-out)).

**a. The `database` test-support leak.** `packages/@grantjs/database/tsconfig.build.json:12-19` excludes `*.test.ts` and `*.spec.ts` but not `src/test-support/`, which holds plain modules — so they compile into the production API image. `schema` has the same shape and was fixed in pass 5; `database` is the remaining one.

**b. The dialect split, which is why (a) is two edits and not one.** Of the **18** packages carrying a `tsconfig.build.json`, **12 extend the shared `packages/@grantjs/tsconfig.build.json`** and **6 extend their own `./tsconfig.json`** (`client`, `cli`, `core`, `database`, `env`, `server`). A pattern added to the shared parent does not reach `database`. Decide whether the dialect is intentional; if it is not, converging it is its own story — this slice fixes the leak and **records** the split.

**Two traps, both already sprung once in pass 5:**

- **A child `exclude` replaces the inherited one; it does not merge.** Pass 5's first attempt at this exact fix dropped the parent's `*.test.ts` patterns and started compiling the whole test suite into the image — worse than the leak. **Restate inherited patterns in full.**
- **A green `tsc` proves nothing here.** Both failures above compiled cleanly. **Verify by listing `dist/` after a production build** and confirming no `test-support` and no `*.test.js`. This is the blocking Verifier step, and it is why this slice does not fan out.

Only `client`, `cli` and `server` in the 6-package dialect group belong to pass 7 — do not edit their configs here beyond recording them.

### 8 — Findings, decisions, and the pass record · light

- **Write `docs/contributing/code-quality/internal-packages.md`**, evidence-first with `file:line` citations throughout. Lead with what holds: lenses 1, 2 and logging discipline were clean across all 13 before the pass and are now locked in.
- **State the structural caveat next to the number**: `knip` reports zero unused exports for every `packages/@grantjs/*` workspace by construction. All 89 came from cross-referencing consumers.
- **Record the three first-run measurement errors** from the brief — the zsh loop that ran once, the lens-1 grep that matched doc comments forbidding the import it appeared to find, and the lens-5 sanity control run against a non-existent symbol. Two are the rubric's own rules biting the pass that invoked them, which is the most transferable thing this pass produces.
- **Correct `README.md`'s pass table**: pass 6 = these 12, pass 7 = the published trio (`client`, `server`, `cli`), and **`apps/config` recorded as unaudited** — 31 files, 4,839 lines, in no pass table today.
- **Record the decisions**: `platform` deleted whole (with the rejected alternatives, so it is not relitigated); `env`'s error exemption; the two rule-7 resolutions from slice 6; the `tsconfig.build.json` dialect.
- **Record the surviving finding**: the api-mount ↔ web-rewrite agreement that nothing enforces.
- **Carry forward to pass 7** in the README's inputs table.

---

## Dependencies / notes

**State of the tree at planning time** (`main` @ `178dd710`, 2026-08-16):

Nothing is in flight but the release PR [#276](https://github.com/grant-js/grant/pull/276) (`chore: version packages`) and the parallel `docs/close-out-pass-5` branch. Neither touches any file in this stack. Pass 5's seven slice branches were pruned at close-out, each confirmed `MERGED` via `gh pr list --head <branch> --state all` rather than by ancestry — **squash merges make ancestry checks structurally unreliable in this repo**, which is what produced a wrong call during pass 5's planning.

**Lockfile**: slices 1 (done) and 3 (`vitest`) both modify `pnpm-lock.yaml`. Standing rule — **regenerate, never hand-merge.**

**Verifier gate on every slice**: `pnpm run type-check`, `lint`, `dead-code:*`, the new tests, plus `tsc --noEmit` on `grant-api`, `grant-web` and `grant-config`.

**Run app type-checks directly, not through turbo.** Slice 1 saw `turbo` report `Tasks: 24 successful, 24 cached — FULL TURBO` in 94 ms on a tree with a package deleted. Nothing had that package as an input, so the cache was correct and the signal was worthless. A cached green is not a verification.

**`grant-config` is new to the Verifier list.** `apps/config` depends on `@grantjs/core`, `@grantjs/env` and `@grantjs/email` — two of them in this pass's scope — and it appears in no previous pass's verification chain.

## Judgment calls for gate 2 {#judgment-calls}

1. **Slice 1 runs before the guardrail slice, contradicting the rubric's stated ordering rule.** Argued in [Ordering rationale](#ordering-rationale): the rule exists for sizing, `platform` was already sized and decided, and writing a DAG rule for a package about to be deleted is work slice 2 would undo. Overrule me if you'd rather the letter of the rule hold — it costs one rule written and removed.
2. **Slice 1 is already implemented and committed** (`7865a712`), ahead of gate 2. It was done under explicit direction at gate 1. Flagging it because implementing before the stack plan is approved is exactly the inversion the gates exist to prevent, and I would rather it be visible than discovered.
3. **Twelve planted violations in slice 2 is the single largest time cost in the stack**, and it is the thing I would most expect to get skipped under pressure. Passes 1–5 each wrote "prove the check fires" and pass 3 is the only one that demonstrably did it. If the budget is not there, say so at gate 2 and cut the number of rules, not the proving.
4. **The 89 dead exports are mostly encapsulation, and I have deliberately not pre-classified all of them.** Slice 6 opens each. A brief that assigns all 89 to an edit class up front would be repeating pass 1's error of counting by tool output rather than by the edit implied — and pass 2's, where a slice's real diff was ~19× its planned example count.
5. **`env`'s error exemption may end with `AGENTS.md` changing rather than the code.** That is the correct outcome for an unfollowable rule and it should not read as the slice failing.
6. **Nothing in this stack touches `apps/api`**, even though slice 6 will likely produce an `apps/api` finding (the `Http*` vocabulary) and pass 5 already left one (D4's third copy of the status literals). Recorded, not actioned — the same discipline that kept pass 5 from acting on D0.
7. **`apps/config` is discovered, not scoped.** It is a third Next.js app with 4,839 lines that no pass has audited and no carried-input entry mentions. It wants its own pass with the `apps/web` lenses, and it should not be absorbed into the last package pass to make the table look finished.

## Corrections {#corrections}

Claims in this plan or the brief that implementation disproved. Recorded **in flight** rather than at close-out, so a slice never runs against a premise a previous slice already killed. Carried into `internal-packages.md` at slice 8.

### C1 — the `tsconfig.build.json` dialect counts were wrong (planning)

**Claimed**, in pass 5's correction C4 and repeated into this plan and the brief: "of the **19** packages carrying a `tsconfig.build.json`, **11** extend the shared parent and **6** extend their own."

**Actual**: **18** package-level configs — 19 counted `packages/@grantjs/tsconfig.build.json`, the shared parent itself, as though it were a package's. And **12**, not 11, extend it. The missing one is `schema`.

**Why it was wrong, and it is rule 1's corollary a third time.** The first measurement read each file's `extends` with `node -e "require('./$f').extends"`. `packages/@grantjs/schema/tsconfig.build.json` contains a `//` comment block — the one pass 5 added at C3 to explain why the `exclude` restates its parent's patterns — so `require()` threw, the shell substitution produced an empty string, and `schema` printed with a blank `extends` column. **A silently failed read looked identical to a package with no `extends`**, and 11+6=17 against a stated 19 was visible on the page and not noticed.

The re-measurement parses `extends` textually and classifies every entry, failing loudly on anything unclassified.

**Disposition**: corrected here, in the brief, and in pass 5's C4 and `schema.md` on `docs/close-out-pass-5`. The finding itself is unaffected — `database` still extends `./tsconfig.json`, so the shared-parent fix still does not reach it, which was C4's actual point.

### C2 — the guardrail gap was one level deeper than "no DAG rule" (slice 2)

**Claimed**, in the brief's [What holds](./2026-08-16-internal-packages-code-quality-brief.md#what-holds): lenses 1 and 2 and logging discipline are "clean across all 13," and the gap is that no ESLint DAG rule or `dead-code` script reaches them.

**Actual**: **nine of the twelve packages had no `lint` script at all**, so `turbo lint` skipped them entirely — `analytics`, `cache`, `email`, `errors`, `jobs`, `logger`, `storage`, `telemetry`, `webhooks`, which is the whole core-port adapter layer. `turbo lint --dry-run` reported **17** tasks where 23 should run. Adding the twelve DAG rules on their own would have produced nine rules that are syntactically valid, permanently green, and never executed.

**Why it matters beyond this slice**: the brief's "clean" was true of the code and meaningless as evidence — no tool had ever looked. Enabling lint surfaced 14 errors immediately (12 autofixable import-sort, plus the two in C3 below). This is pass 3's carried input — _a guardrail that passes is not a guardrail that works_ — displaced one level: **check that the runner runs the rule, not just that the rule is correct.** `turbo <task> --dry-run=json` and filtering on `command !== '<NONEXISTENT>'` is the check.

**Disposition**: lint scripts added to all nine; the 12 import-sort errors fixed; all twelve DAG rules then proven to fire in both directions (a planted `@grantjs/database` import errors in all twelve; `@grantjs/schema` is accepted in `jobs` and rejected in `cache`, confirming the allowlist is per-package and not a blanket ban).

### C3 — Tier 0: CloudWatch telemetry could never have worked (slice 2)

**Claimed**, implicitly, by every earlier pass: `@grantjs/telemetry` is a working adapter with a `cloudwatch` provider.

**Actual**: `cloudwatch.ts:32,62` called `require()` inside a package declaring `"type": "module"`. `require` is not defined in ESM, so **every** `sendLog` threw `ReferenceError: require is not defined`. `TELEMETRY_PROVIDER=cloudwatch` is a validated enum value (`packages/@grantjs/env/src/schema.ts:211`) wired through `apps/api/src/config/env.config.ts:517-525`, so the provider was selectable and non-functional. Worse, the `catch` reported `CloudWatch Logs client not available; install @aws-sdk/client-cloudwatch-logs` — pointing an operator at a package that is already a declared peer and whose installation would not have helped.

**Proven, not reasoned**: compiled the package with its own `tsconfig.build.json`, confirmed `require(...)` survives verbatim into ESM output, and executed both forms in the package's own resolution context — `require` throws `ReferenceError`, `await import` returns a working `CloudWatchLogsClient`.

**A second defect was hiding behind the first.** `require()` returns `any`, so the hand-rolled `{ send: (cmd: unknown) => Promise<{ nextSequenceToken?: string }> }` client type never had to match the real `CloudWatchLogsClient` — and does not. Fixing the import made the type real and `tsc` rejected it immediately. Now typed through a **type-only** import, erased at compile time so the optional peer stays optional at runtime.

**The single-style reading**: `email/ses/index.ts:1` and `storage/s3/index.ts:1` load the same class of optional AWS peer with plain static imports. `telemetry` was the only package using `require()`, and it was the only one that had never been linted. The two facts are the same fact.

**Disposition**: fixed in slice 2 under gate-1 direction, because enabling lint on `telemetry` is what exposed it and the guardrail could not land green otherwise. **Slice 3 owes this a regression test** — there is still no test asserting the adapter can load its client.

### C4 — the C3 regression test cannot be written in vitest (slice 3)

**Claimed**, by slice 2 and by this plan's slice-3 detail: slice 3 "owes a regression test" for the CloudWatch `require()` defect.

**Actual**: no vitest test can catch it. Vitest runs sources through vite's transform, which supplies CJS interop — `typeof require` is `'function'` inside a test where it is `undefined` in the ESM output Node actually runs. Reverting `cloudwatch.ts` to `require()` and re-running the suite leaves it **green**. Verified by mutating and re-running, not reasoned.

**Why it matters beyond this file**: the test runner does not reproduce the production module system, so **any** ESM/CJS defect in these packages is invisible to unit tests. That is a standing limit on what lens 7 can detect here, and it is the second time this pass that the thing being trusted had never been exercised.

**Disposition**: the vacuous assertion was deleted rather than kept for the count. The defect is guarded by `@typescript-eslint/no-require-imports`, which slice 2 enabled on this package for the first time and which is proven to fire, plus executing `dist/`. A test pinning `typeof require === 'function'` is left in place so the day vitest changes its transform, someone is told.

### C5 — IPv6 literals are never recognised as literal addresses (slice 3)

**Found while characterizing** `webhooks/src/ssrf.ts`. `url.hostname` keeps the square brackets for an IPv6 literal (`https://[::1]/` → `[::1]`), and `isIP('[::1]')` is `0`. So the literal-IP branch at `ssrf.ts:107` never matches an IPv6 target: every one falls through to the DNS branch, where a bracketed string cannot resolve, and is rejected as `could not be resolved`.

**Not an SSRF hole — it fails closed.** `[::1]`, `[::ffff:127.0.0.1]` and every other private IPv6 literal is blocked. Three consequences that are still real:

1. `isPrivateIPv6` and the `::ffff:` unwrapping in `isPrivateAddress` are **dead code** on the literal path. They run only against DNS-resolved addresses, which come back unbracketed.
2. The rejection message is wrong, which will cost someone an afternoon.
3. **A public IPv6 literal cannot be configured as a webhook target at all** — `https://[2606:4700:4700::1111]/` is rejected. That is a functional bug, not a security one.

**Disposition**: characterized as-is and pinned by `ssrf.test.ts`, per the rubric's rule that a Tier 0 candidate found by lens 7 is classified separately from being fixed. The fix is one line (strip brackets before `isIP`), but it **changes what the guard admits** — a public IPv6 literal starts being allowed — so it wants Security's eyes and its own slice, not a quiet edit inside a test PR.

### C6 — the dead-export classifier must scope to the package, not `src/` (slice 6)

**Claimed**, by the brief: 89 exports have no reference outside their own package, listed per package.

**Actual**: the number was 82 by the time slice 6 ran (slices 4–5 moved it), and the first classifier was **wrong in a way that would have deleted live code**. It scanned `src/` only, so it reported `TAILWIND_SHADE_500_HEX` as dead when `packages/@grantjs/constants/scripts/check-palette-distance.ts` imports it — a package-local consumer outside `src/`. Re-scoping to the whole package plus `docs/` also rescued `getLocalesPath` and `jobRegistry`.

**Disposition**: classifier rewritten; 75 symbols, split 28 / 40 / 7 by edit class. `jobRegistry`'s docs-only reference became its own finding — `docs/advanced-topics/job-scheduling.md:77` imports it from a path that does not exist.

### C7 — both rule-7 ambiguities were false alarms (slice 6)

**Claimed**, by the brief: `@grantjs/errors`' 8 `Http*` subclasses and `constants`' account-tier role vocabulary are ambiguous between "superseded" and "the call site is missing", and need a human decision before deletion.

**Actual**: both are **alive**, and the brief's two options did not include the true one — _used inside the package, invisible to a cross-package reference count_. `mapDomainToHttp` constructs all eight `Http*` classes; `ACCOUNT_ROLES` feeds `ACCOUNT_ROLE_DEFINITIONS` feeds `ROLES`, which has four external importers.

**Why it was wrong**: the brief reasoned from the reference _count_ (zero external) without opening the package to see what consumed them internally. Rule 2 — a rule violation is not automatically a defect — applied to a tool's output rather than to a lint rule.

**Disposition**: no human decision was needed; neither was deleted. The two genuine rule-7 keeps are different symbols (`isDefaultResourceAction`, `TenantJobPayload`) and remain open.

## Human gates

- [x] Gate 1: Story brief approved — 2026-08-16, Ale Heredia.
- [x] Gate 2: Stack plan approved — 2026-08-16, Ale Heredia. Implementation proceeds from slice 2, one slice at a time.
- [x] Gate 3: Stack PRs merged into trunk — 2026-08-18, Ale Heredia. All 8 merged via stack #282.

**Trunk verified by content, not by commit messages.** Pass 4's failure mode is merging bottom-up and leaving the trunk holding one slice out of five, so each slice's artifact was checked on the assembled trunk: `platform` absent from the git tree, 12 entries in `INTERNAL_PACKAGE_DEPS`, 9 lint scripts present, 2 `await import` in `cloudwatch.ts`, 3 test files, 1 raw `throw new Error`, 1 `noopLogger` declaration, 0 `isValidTagColor`, `src/test-support` excluded, findings doc present.

- [x] Gate 4: Story → `main` deep review complete — merged as #289, 2026-08-18. Release pipeline clean.

## Gate 4 — integration verification {#gate-4-verification}

Run on the assembled trunk after merging `origin/main` in, 2026-08-18. Gate 4 is integration verification, not a re-review of diffs each slice already had.

| Check                                                      | Result                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `format:check`                                             | pass                                                                              |
| `lint`                                                     | 26/26                                                                             |
| `type-check`                                               | 24/24                                                                             |
| `test`                                                     | 13/13                                                                             |
| `build`                                                    | 11/11                                                                             |
| `dead-code:{api,web,core,database,schema,packages}`        | 6/6 pass                                                                          |
| `codegen:check`                                            | pass                                                                              |
| `tsc --noEmit` on `grant-api`, `grant-web`, `grant-config` | pass, run **directly** — turbo reports `FULL TURBO` cache hits that prove nothing |
| `scripts/docker/build-api-production.mjs`                  | completes — the stage pass 5's C3 broke                                           |

**Artifact checks, because a green build is not the deliverable:**

- No `test-support` anywhere under any `dist/` — slice 7 holds in the real production build, not just in the isolated `tsc` run it was developed against.
- No compiled `*.test.js` / `*.spec.js`.
- Assets still copied: 79 database migrations, 425 schema SDL files. The fix removed what it should and nothing else.

**No changeset needed.** `schema`, `client`, `server` and `cli` are byte-identical to `main` across this story — the only published packages. Pass 5 needed one because it changed `@grantjs/schema`; this story touches private packages only.

**One trap avoided**: `build-api-production.mjs` rewrites each package's `package.json` `main` to point at `dist/` as its last step. Those mutations were reverted before committing; they are build output, not a change.

## Carried out of this pass {#carried-out}

Open at close-out. The findings document's [Open items](../docs/contributing/code-quality/internal-packages.md#open) is the durable list; this records disposition.

| Item                                                                                                                                                                                                                  | Disposition                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **IPv6 literals never recognised as literal addresses** (`webhooks/src/ssrf.ts:107`). Fails closed, so not an SSRF hole, but `isPrivateIPv6` is dead code on that path and a public IPv6 literal cannot be configured | **Own story, Security-owned.** The one-line fix changes what the guard _admits_ |
| **`jobRegistry` documented at a path that does not exist** — `docs/advanced-topics/job-scheduling.md:77` imports from `@/lib/jobs/job-registry`; `apps/api` composes via `JobFactory` + `createJobs`                  | Either the doc or the registry is wrong. Small docs story                       |
| **`isDefaultResourceAction`, `TenantJobPayload`** — the two rule-7 keeps                                                                                                                                              | Open. Neither is safe to sweep                                                  |
| **The 40 cross-file exports** — whether the package _barrel_ should re-export each                                                                                                                                    | Unmade policy decision, not a defect                                            |
| **Factory style**: 6 static classes vs 1 function                                                                                                                                                                     | Cheap Tier 3, unactioned                                                        |
| **`tsconfig.build.json` dialects**: 12 shared parent vs 6 own                                                                                                                                                         | Recorded in slice 7; converging is its own story                                |
| **Two ineffective excludes in `database`**: `src/seed/**/*` matches nothing; `src/scripts/**/*` cannot take effect                                                                                                    | Misleading, not wrong — the files should ship                                   |
| **Pass 7** — published trio (`client`, `server`, `cli`)                                                                                                                                                               | A contract audit, not a consistency pass                                        |
| **Pass 8** — `apps/config`, 4,839 lines                                                                                                                                                                               | Never audited by any pass                                                       |

Explicitly **not** carried: pass 5's D0 (SDL split), D1 (62 operation renames) and D4 (`apps/api`'s third copy of the status literals). They remain on `schema.md`'s backlog as their own stories, untouched by this pass as planned.

## Cleanup

- [x] Local and remote slice branches deleted — all 10 (8 slices + trunk + `docs/close-out-pass-5`) confirmed `MERGED` via `gh pr list --head <branch> --state all` before deletion, never by ancestry. `git branch` now shows only `main`; `git ls-remote` shows zero story branches.
- [x] Worktree removed — none was added; `git worktree list` showed only the main checkout throughout.
- [x] Stack plan status → `merged-to-main`
