# Stack plan — the published trio (`client`, `server`, `cli`) code quality remediation

## Metadata

- **Slug**: `published-packages-code-quality`
- **Story brief**: [`plans/2026-08-19-published-packages-code-quality-brief.md`](./2026-08-19-published-packages-code-quality-brief.md) — approved 2026-08-19, Ale Heredia
- **Findings**: `docs/contributing/code-quality/published-packages.md` — written by slice 8
- **Status**: **in-progress** — gate 2 cleared 2026-08-19, Ale Heredia. Slice 1 committed (`58edebd1`); slices land one at a time. Not yet pushed.
- **Story trunk**: `feat/published-packages-code-quality`
- **worktree_path**: **not required** — `git worktree list` shows only the main checkout and no other story is in flight. Slices run serially in the main checkout, as in passes 4–6. Add a worktree only if a second story opens mid-stack.
- **Base**: `main` at `76e765d4` (pass 6 close-out, #290). Every `file:line` citation in this plan and the brief re-verifies against this commit.
- **Pass**: 7 of the [code quality passes](../docs/contributing/code-quality/README.md)

## Active roles

- [ ] Project Manager — gate decisions, slice 8
- [ ] Principal Engineer — slice order, integration
- [ ] Architect — slices 1, 2, 5 (publish boundary, the trio's entry in the package graph, the public-type delta)
- [ ] Senior Backend — slices 1, 2, 3, 5, 7
- [ ] **Senior Frontend — slice 3.** Active this pass, unlike pass 6: two of the five example workspaces are Next.js apps entering the type-check gate for the first time
- [ ] **Senior QA — slices 4 and 6, the load-bearing role this story**
- [ ] Senior Security — slice 4, blocking, independent of the slice author
- [ ] Verifier — after every slice: `lint`, `dead-code:*`, tests, and **`turbo type-check --force`** (never a cached run — see [below](#non-cached))

## Ordered slices (PRs)

| #     | Branch                                        | Base                                   | Concern                                                                             | Owner          | Review bar         |
| ----- | --------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- | -------------- | ------------------ |
| 1     | `feat/published-packages-cq-publish-boundary` | `feat/published-packages-code-quality` | **0.2 (Tier 0)** the dead `paths`, + schema's build script and `files` metadata     | Backend + Arch | light, artifact¹   |
| 2     | `feat/published-packages-cq-guardrails`       | slice 1                                | ESLint DAG ×3, `dead-code:published`, `AGENTS.md` trio correction                   | Backend + Arch | light              |
| 3     | `feat/published-packages-cq-ci-release`       | slice 2                                | 5 examples into `lint` + `type-check`; `release:check` into CI; changeset gaps      | Backend + FE   | light              |
| 4     | `feat/published-packages-cq-token-extractor`  | slice 3                                | **Lens 7 as detector** — `token-extractor.ts`, published auth surface               | **QA**         | light, escalating² |
| 5     | `feat/published-packages-cq-schema-types`     | slice 4                                | **Tier 2.1–2.2** — adopt codegen'd types, delete `core`'s orphan                    | Backend + Arch | light, artifact³   |
| 6     | `feat/published-packages-cq-coverage`         | slice 5                                | Remaining untested surface, weighted by lines                                       | **QA**         | light              |
| 7     | `feat/published-packages-cq-build-config`     | slice 6                                | **Tier 3.2–3.3** — tsconfig dialects, the `dts` exclude divergence                  | Backend        | light, artifact¹   |
| 8     | `feat/published-packages-cq-docs`             | slice 7                                | Findings doc + **backlog (2.4)**, pass table, carried inputs, `AGENTS.md` exemption | PM + Arch      | light              |
| final | `feat/published-packages-code-quality`        | `main`                                 | integration                                                                         | Principal      | **deep**           |

¹ Not a bar, a **blocking Verifier step**: clean-build and list `dist/`. Pass 5's C4 is the precedent — a green `tsc` hid a leak that only an artifact listing caught.

² **Escalates to `security-full` if characterization finds a bypass.** `token-extractor.ts` decides which credential authenticates a request and is published API (`extractBearerToken`, `extractTokenFromRequest` both appear in `dist/index.d.ts`). Do not withdraw this footnote without running the tests first.

³ **Blocking Verifier step: diff the built `.d.ts` before and after.** The brief's Tier 2 table is the _entire_ permitted public-surface delta; anything else moving means the slice did more than it claimed.

The story→main bar is `deep`: this stack changes what three npm packages publish, alters their public type surface, and touches a released Docker image's workspace.

## Ordering rationale

Driven by **what verifies what**, not by layer order.

**Slice 1 before the guardrails — this inverts the rubric's stated rule, deliberately.** `README.md:199` says widening a guardrail is the first slice of a pass, and its stated reason is sizing: run the tool early so you know the unit's true size before writing findings. That reason does not hold here, because **the tool's result is currently non-deterministic**. `turbo type-check` is green from cache and red under `--force` on the same tree, and which one you get depends on whether a stale `packages/@grantjs/schema/dist/` exists — an artefact the repo's own production build produces and `pnpm build` does not (0.1/0.2). Widening a gate whose output depends on filesystem state means the gate proves nothing, and every later slice's Verifier step inherits the same doubt.

This is the same class of deviation pass 6 recorded for its own slice 1, for a different reason. **The rule's purpose is served, its letter is not** — recorded here rather than silently deviated from.

**Slice 5 after slice 1 — the gate-1 ordering note.** Adopting `@grantjs/schema`'s codegen'd types deepens `client`'s and `server`'s dependency on schema. That dependency stays **type-only** either way, which is what keeps schema's raw-`.ts` `main` survivable — but slice 1 is where that property is examined and recorded, and widening the surface before the publish metadata describes reality would build on a shape nobody has signed off. Slice 1 also removes the `paths` mapping the type adoption would otherwise inherit.

**Slice 4 before slices 5 and 6 — the detector principle.** Lens 7 is a detector here, not a backlog item; pass 1's untested base classes produced three Tier 0 findings and pass 6's SSRF work produced its own. If `token-extractor.ts` has a real bypass, that changes what the later slices are allowed to touch and may open its own story. Testing _after_ refactoring inverts the evidence.

**Slice 3 isolated from slice 2.** Five example workspaces have never been type-checked; switching the gate on may surface pre-existing errors (flagged in the brief's risk list). Keeping that in its own slice stops the noise contaminating slice 2's proof that the three new DAG rules fire.

**Slice 7 late, and after slice 1 rather than folded into it.** Both touch `client/tsconfig.json` and `server/tsconfig.json`, so they collide — serial, not fan-out. Slice 1 removes a `paths` entry that fails open; slice 7 decides which parent those files extend. Keeping them apart keeps the contract-critical diff small enough to review as one idea.

**Slice 2's `AGENTS.md` correction rides with the rules, not with the docs slice** — pass 6's reasoning applies unchanged: deriving each package's allowed set _is_ deriving the graph entry.

## Fan-out

**Default is serial**, consistent with passes 2–6 and single-reviewer bandwidth.

**The one load-bearing fan-out**: slice 4's Security review must be an independent pass, not evidence the QA author gathers about their own tests. The question for Security is not "do these tests pass" but **"what does the extractor admit that it should not, and does a test encode a bypass as correct behaviour."** Characterize first — assert what the code does today including what looks wrong, then classify each behaviour as defect or intended, separately.

Specific things worth pointing Security at, none of them yet a finding:

- `parseCookieHeader` (`server/src/utils/token-extractor.ts:22-30`) is hand-rolled, splits on `;` and `=`, and does **not** URL-decode.
- On a duplicate cookie name the **last value wins** — cookie shadowing from a subdomain is a real attack class, and whether last-wins matters here is a question for tests, not for reading.
- Precedence is `config.getToken` → `Authorization` header → cookie, and it differs between the Web-API branch (`:64-78`) and the Express branch (`:80-97`) — the Express branch consults `req.cookies` before the raw cookie header, the Web-API branch has no equivalent.

## Verification that must not be cached {#non-cached}

Three rules for this stack specifically, each earned during the assessment:

1. **`turbo type-check --force`, always.** A cache hit is not a check. The assessment had a green cached run and a red forced run on the same tree.
2. **Slice 1 must prove the fragility is gone by planting it.** Deliberately create a stale `packages/@grantjs/schema/dist/`, then run the forced type-check and confirm it still passes. A clean tree passing proves nothing — it passed before the fix too.
3. **Artefact listing after any slice touching the build chain** (1, 5, 7): clean-build each package and list `dist/`, then re-check that every `exports` condition target resolves. All 24 resolve today; that is a lens to keep green, not to re-derive.

## Stack setup

```sh
# 1. Trunk
git switch -c feat/published-packages-code-quality main && git push -u origin feat/published-packages-code-quality

# 2. Init with the FIRST slice only -- NOT all eight. See C6: declaring every branch
#    up front is what produced the orphaned branches and the dead PR banners.
gh stack init --base feat/published-packages-code-quality feat/published-packages-cq-publish-boundary

# 3. After each slice: commit, then both commands, every time.
gh stack submit --auto                                                  # --auto required in a non-TTY
gh stack link --base feat/published-packages-code-quality <pr> <pr>     # bottom to top; grows the stack ON GitHub

# 4. Before the NEXT slice -- creates it on the current tip, pushes nothing:
gh stack add feat/published-packages-cq-<next>

# 5. After any merge/rebase/amend below a branch:
gh stack sync
```

**Give anything that pushes at least 15 minutes** ([C4](#c4)) -- `.husky/pre-push` runs a
~10-minute chain including `codegen:check`, and killing it mid-run corrupts `src/generated/`.

**Check branch positions before writing a slice, not after** ([C5](#c5)):

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

Root on `feat/published-packages-code-quality`, never `main` — omitting `--base` skips gate 4 and turns one release into eight. The same applies to `gh stack link` if PRs are adopted mid-flight.

Confirm the stack is actually on GitHub — `gh stack view` renders the local tree whether or not it exists remotely, so it is not the check:

```sh
gh pr view <bottom-pr> --json baseRefName   # must be the trunk
```

Pass 6's operational notes carry forward unchanged: `gh stack init` adopts existing branches and creates missing ones (declare all eight up front); `gh stack submit` is interactive and hangs in an agent shell without `--auto`; and `--auto` does **not** create the GitHub Stack object when every PR already exists — only `gh stack link` does that non-interactively. See [pass 6's stack plan](./2026-08-16-internal-packages-code-quality-stack.md#gh-stack-usage).

## Slice detail

### Slice 1 — the `@grantjs/schema` publish boundary {#slice-1}

**Rescoped 2026-08-19 after gate 1** — see the brief's [Tier 0](./2026-08-19-published-packages-code-quality-brief.md#tier-0). What looked like a three-defect chain is one real defect plus two hygiene items, and the slice is smaller than the original plan implied.

**0.2 is the reason this slice is first, and it is the only Tier 0 left.** `client/tsconfig.json:10` and `server/tsconfig.json:13` map `@grantjs/schema` → `../schema/dist/index.d.ts`. The shared build parent sets `"declaration": false` (`packages/@grantjs/tsconfig.build.json`), so **no build path in the repo emits that file** — production's included. Permanently dead config, and it fails open: type-check passes via silent node fallback when `schema/dist/` is absent and fails with 7 × TS6059 when a stale one exists. Delete the mapping; let node resolution do what it already does.

**0.1 is hygiene, not a fix.** `schema`'s `build` is bare `tsc` → `tsconfig.json` → root `noEmit: true`, so it emits nothing — **by design**. Production compiles via `scripts/docker/build-api-production.mjs` using `tsconfig.build.json`, copies `src/schema` → `dist/schema` for the SDL (`:17,:58`), and already throws if a package emits no dist (`:81-83`). `schema/tsconfig.build.json` states this in a comment. Make the script honest (point it at `tsconfig.build.json`, or mark the no-op explicitly) — **do not "fix" it into emitting**, which would put a second, unused `dist/` next to the one production builds and re-create exactly the stale-dist hazard 0.2 exists to remove.

**0.3 is published metadata.** `files: ["dist/**/*", "src/**/*"]` advertises a `dist/**/*` the published package never produces. Drop the half that does not ship, and record the `main`/`types` decision. Architect owns that call. Relevant input: schema is **not** types-only — 172 runtime value exports, 117 of them gql `*Document` constants used by `apps/web` at runtime — but `client` and `server` consume it **type-only**, which is why the current shape survives. The decision is about npm consumers of the SDKs, not about internal use.

**Verification, all three blocking:**

- `turbo type-check --force` with a **stale `schema/dist/` deliberately planted**. A clean tree passing proves nothing — it passed before the fix.
- `npm pack --dry-run` on schema, to see the real tarball rather than the `files` array's claim.
- **The production API image still builds.** `build-api-production.mjs` composes `tsconfig.build.json` paths for 15 packages and throws if one is missing — pass 5's C3 broke precisely this, and this slice touches that file's neighbourhood.

### Slice 2 — guardrails

Allowed sets derived from each package's own `package.json` (pass 4's carried input — copying a sibling's rule broke the build once): `client` → `@grantjs/schema`, `server` → `@grantjs/schema`, `cli` → nothing. Express them as negated patterns, as `INTERNAL_PACKAGE_DEPS` already does, so a new workspace package is covered the day it is created.

`eslint.config.mjs:38-39` currently reads "The published packages (client, server, cli) are deliberately absent … audited in pass 7." Replace the comment along with the exclusion.

**Prove all three fire, in both directions** — a planted `@grantjs/database` import must error in all three, and `@grantjs/schema` must be accepted in `client`/`server` while rejected in `cli`. A blanket ban that happens to be green is not the same rule.

Add `dead-code:published` to `package.json` and CI, and **state knip's compounded blind spot next to its zero** in the findings doc: `entry: ["src/index.ts"]` makes barrel re-exports used by construction, and semver makes a genuinely-unused export non-deletable anyway. What it can still catch is unused _files_ and _dependencies_.

### Slice 3 — CI and release gates

Five example workspaces: `example-express` (128L), `example-fastify` (147L), `example-nestjs` (172L) have no `lint` script; **none of the five has `type-check`**. `example-nextjs-client` (1,122L) is built as a Docker image in `release.yml:78,93,123,308` — a released artefact that has never been type-checked.

Also here: wire `release:check` (`package.json:67`) into CI — the script enforcing _which packages may be published_ runs in no workflow today — and classify `@grantjs/env` and `@grantjs/webhooks` in `.changeset/config.json`, which are in neither `fixed` nor `ignore` while all 12 of their siblings are in `ignore`.

Verify coverage with `turbo <task> --dry-run=json` filtered on `command !== '<NONEXISTENT>'` (pass 6's carried input), not by reading `package.json`.

### Slice 4 — `token-extractor.ts` as detector

See [Fan-out](#fan-out). **Characterize first.** Every test mutation-checked before being counted, and **each mutation must assert it actually applied** — pass 6 had one that silently did not match and reported green.

### Slice 5 — adopt the codegen'd types

`client` and `server` drop their hand-written `AuthorizationResult`, `Permission`, `Resource` and re-export schema's; `core/src/types/index.ts:132`'s orphan is deleted. The brief's Tier 2 table is the complete permitted delta — required fields unchanged, so consumers constructing values are unaffected; the `null`/enum deltas are a bug fix, since the old types misdescribed a payload that already carried those values.

**Ships as a minor. No major, in this slice or as a consequence of it** — the platform stays in lockstep on 1.5.x, per gate 1. `ApiError` stays duplicated (no SDL source; it is the REST error envelope) and is explicitly not in scope here.

### Slice 6 — remaining coverage

Weighted by lines at risk, not file count. `server` is 11 of 20 runtime files untested; the concentration after slice 4 is `nest/grant.module.ts`, `nest/grant.decorator.ts`, `errors.ts` and the four sub-barrels. `cli`'s gap is dominated by one file, `commands/config-cmd.ts` (304L). `client` is effectively complete (1,347 test lines against 938 runtime) and needs nothing.

### Slice 7 — build config hygiene

Tier 3.2: `client`, `cli` and `server` are three of the six packages extending their own `./tsconfig.json` rather than the shared parent. **A recorded decision is an acceptable outcome** — the published packages have real reasons to differ (`declaration`, `declarationMap`, per-package `paths`) and pass 6 left the repo-wide question open. Say which, and why.

Tier 3.3: `cli`'s vite `dts` plugin has no `exclude` where `client` and `server` both set one; it is covered today only by `tsconfig.build.json`. Verified working — zero test `.d.ts` in any dist — so this is convergence, not a defect. A contributor copying `cli`'s vite config into a new package would ship its tests.

### Slice 8 — findings and carried inputs

`docs/contributing/code-quality/published-packages.md`, with the **Backlog** section carrying [2.4](./2026-08-19-published-packages-code-quality-brief.md#tier-2) — `apps/api`'s `matchedPermission: z.unknown()` OpenAPI defect — in the shape pass 4's backlog used, so the follow-up story can be scoped without re-deriving the evidence. Record the published-package error-vocabulary exemption in `AGENTS.md` alongside `env`'s.

Mark pass 7 done in the README table, leave pass 8 (`apps/config`) named, and write the carried inputs.

## Dependencies / notes

- **No other story in flight**; no parallel branch to collide with. `main` is at `76e765d4` with a clean tree.
- **`apps/api` is out of scope for every slice.** 2.4 is recorded, not fixed.
- Slices 1, 5 and 7 all touch published artefacts or their metadata; each carries a blocking artefact check rather than relying on a green compile.

## Human gates

- [ ] Gate 2: Stack plan approved — no implementation until a human confirms.
- [ ] Gate 3: Stack PRs merged into trunk (light; slice 4 escalates to `security-full` if characterization finds a bypass).
- [ ] Gate 4: Story → `main` **deep** review complete.

## Cleanup

- [ ] `git worktree remove` (not used unless a second story opens)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`

## Corrections

Claims in this stack's own planning documents that implementation disproves go here, as in passes 3–6.

### C1 — "delete the mapping; let node resolution do what it already does" was wrong {#c1}

Slice 1's own plan text said exactly that, and deleting the `paths` key **fails**: a child
`paths` replaces the inherited one, so removing it re-inherits the root tsconfig's
`@grantjs/*` → `./packages/@grantjs/*` mapping. That resolves `@grantjs/schema` to its
`.ts` source, which is outside the package's inferred `rootDir`, and produces the same
TS6059 class the fix exists to remove — 8 errors on the first attempt.

The working fix is an explicit `"paths": {}`. **This is pass 5's C4 in a second location**
— the lesson was recorded for `exclude` (a child replaces the inherited list) and applies
verbatim to `paths`, which pass 5 never mentioned. Recorded here so pass 8 does not
rediscover it in a third.

Caught because the plan required a forced type-check after the edit rather than assuming
the removal was inert.

### C2 — the "artefact" verification had a side effect the plan did not mention

`scripts/docker/build-api-production.mjs` calls `patchWorkspaceExports`, which **rewrites
15 `package.json` files in place** to point `main` at `dist`. Running it as a verification
step leaves the working tree modified in 14 packages the slice never intended to touch.
Back up and restore around it, and clean the `dist/` directories it creates — leaving them
is precisely the stale-artefact state this slice removes.

### C3 — the `dead-code` gate cannot land in the guardrail slice {#c3}

The plan put `dead-code:published` in slice 2 with the ESLint rules. Running `knip` on the
trio first shows why that ordering does not work: it reports **22 findings**, and the gate
would be red from slice 2 until slice 5.

`knip` behaves better here than the brief predicted — it infers entry points from each
package's `exports` map, so the subpath barrels (`client/react`, `server/{express,fastify,next,nest}`)
are correctly treated as public and the `entry: ["src/index.ts"]` line is flagged redundant.
The 22 are real. But they are **owned by later slices**:

| Finding                                                  | Owner                                                                                                                                    |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `server`'s `Permission`, `Resource`, `ApiError`          | slice 5 — deleted when the SDKs adopt schema's types                                                                                     |
| `extractTokenFromCookies`                                | slice 4                                                                                                                                  |
| `cli`'s 4 unused barrel re-exports + 11 unused types     | dead-surface decisions; `config/index.ts` is alive (3 `commands/` files import it), so these are per-export edits, not a barrel deletion |
| `xdg-open` unlisted binary (`cli/src/commands/start.ts`) | legitimate — a spawned system binary, needs `ignoreBinaries`                                                                             |

Suppressing findings that three later slices are about to fix would make the gate lie, and
landing it red would break the stack. **Moved to slice 6**, where the remaining set is small
enough to action honestly. The ESLint DAG rules — the part that has no such dependency —
land in slice 2 as planned.

This is the rubric's own ordering rule (_widen the guardrail first_) meeting the same limit
slice 1 hit: a gate is only worth adding once it can be **both** enabled and green, and
here that depends on work the gate itself does not do.

### C4 — killing a `gh stack` command mid-push corrupts the working tree {#c4}

`.husky/pre-push` runs `format:check`, `lint`, **six** `dead-code:*` targets,
`codegen:check`, `type-check`, `build`, the full test suite, and `secret-scan`.
`codegen:check` runs `pnpm --filter @grantjs/schema generate`, which writes the three
committed files under `src/generated/` before diffing them.

**`graphql-codegen` is deterministic, and an earlier draft of this entry implied
otherwise.** Two consecutive runs are byte-identical, and identical to what is committed —
verified with `md5sum`. There is no drift risk and nothing wrong with the script. What
follows is a **partial-write** hazard, which exists only while the process can be
interrupted.

Running `gh stack submit --auto` under a 5-minute timeout SIGTERM'd that chain mid-codegen
and left partially-regenerated output in the working tree — `graphql.ts` at **1,048 lines
instead of 10,263**, all three files unformatted because codegen's `afterAllFileWrite`
prettier hook never ran. Nothing reported an error; the next command to notice was
`gh stack sync` refusing to rebase with "You have unstaged changes."

**Correction to this entry's own first draft.** It said the chain takes "~10 minutes."
That was never measured. Measured cold (`--force`, so nothing is cached):

| step              | cold |
| ----------------- | ---- |
| `build`           | 46s  |
| `format:check`    | 20s  |
| `test`            | 13s  |
| 6 x `dead-code:*` | ~12s |
| `codegen:check`   | 5s   |

About **two minutes**, not ten. The five-minute timeout was blown by a multiplier the
first diagnosis missed: **the hook fires once per branch pushed**, and `gh stack submit`
pushes every branch in the stack. Instrumented and counted — one `submit --auto` of a
six-branch stack produced **six** hook invocations; at the time of the failure the stack
had eight. Two minutes each, serially, is what ran past the timeout.

That makes the heavy hook and [C6](#c6)'s all-branches-up-front `init` the same bug seen
twice: the cost of the hook is multiplied by the number of branches the stack pushes, so
the fix for one reduces the other.

Two things worth carrying:

- **Give any command that pushes at least 15 minutes**, or the hook is a coin flip. This is
  the reason the earlier `submit --auto` appeared to "hang" — it was not hanging, it was
  running the pre-push chain once per branch, and pass 6's note about `submit` being
  interactive sent the diagnosis the wrong way.
- **The interruption window is the only real cost, and it closes by not running the check
  twice.** `codegen:check` is already a CI gate on every PR, so running it again in
  pre-push — once per branch pushed — buys nothing. Dropping it from the hook removes the
  hazard without changing a line of the script. A recommendation, not a defect: this entry
  first called the script a footgun, and the determinism check disproved that.
- **A truncated generated file looks like a legitimate diff.** The recovery is
  `git checkout -- src/generated/` then a _complete_ `generate` run plus
  `git diff --exit-code`, which confirmed **no real drift** — the committed files were
  correct the whole time. Never resolve a codegen diff by committing what is in the tree;
  regenerate from a clean checkout first (pass 5's carried input: the fix is upstream, and
  a hand-edited generated file is reverted by the next run).

### C5 — `gh stack sync` reports success without restacking the unworked branches {#c5}

**Remedied in slice 6** — `docs/contributing/agentic-sdlc.md` now prescribes `gh stack add`
per slice instead of declaring every branch in one `init`. The rest of this entry is the
diagnosis that produced that change.

`agentic-sdlc.md` § [Declaring all branches up front](../docs/contributing/agentic-sdlc.md#init-consequences)
warns that rebasing a slice orphans everything above it, and prescribes `gh stack sync`.
Pass 7 ran `sync` after every slice — it printed `✓ Pushed and synced 8 branches` — and
slices 5–8 **stayed on slice 2's tip anyway**:

```
feat/...-cq-ci-release       5fbd77c0   (slice 3, correct)
feat/...-cq-token-extractor  c1210368   (slice 4, correct)
feat/...-cq-schema-types     137faf8c   <- slice 2's tip
feat/...-cq-coverage         137faf8c   <- slice 2's tip
feat/...-cq-build-config     137faf8c   <- slice 2's tip
feat/...-cq-docs             137faf8c   <- slice 2's tip
```

`sync` advances branches that have PRs; branches with no commits are reported
(`⚠ … has no PR`) and left where they are. So slice 5 was written against a base missing
slices 3 and 4 — caught only because the test count came back **5 files / 31 tests**
where slice 4 had just made it 6 / 61.

**The check is the doc's, and it has to be run before writing each slice, not after:**

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

Recovery for a slice with no commits yet is a branch move, not a rebase:
`git stash && git switch -C <slice-n> <slice-n-1> && git stash pop`.

The transferable form is pass 6's _check that the runner runs the check_, one level over:
**a tool reporting success is not the tool having done the thing.** `✓ Pushed and synced 8
branches` is true — it pushed eight branches — and false about the eight being correctly
based.

### C6 — the stacking workflow itself was the defect, and this pass fixes it {#c6}

Raised from the PR list: three "Compare & pull request" banners for `-coverage`,
`-build-config` and `-docs`, branches with zero commits that `submit`/`sync` keep pushing.
`agentic-sdlc.md` documented those banners as expected noise and told readers to leave
them.

They are not expected. They are a **consequence of declaring all slice branches up front**,
which is also the direct cause of [C5](#c5). `gh stack --help`'s own example block states
the intended model:

```
# Make changes and commit, then add a branch to the stack
$ gh stack add branch4
```

`gh stack add` creates the branch on top of the **current** tip and checks it out, and
**pushes nothing** — verified: after `add`, `git ls-remote` shows no such branch. Both
failure modes disappear, because an unwritten slice has no branch at all: nothing to push,
nothing to leave stranded, nothing to orphan.

What this pass did:

1. Removed the three unwritten branches from `.git/gh-stack`, then deleted them local and
   remote. Confirmed `gh stack sync` then pushes **5 branches, not 8**, and does not
   recreate them — deleting the remote branch alone would not have held, which is what the
   old doc meant by "deleting fights the tool."
2. Rewrote `agentic-sdlc.md` § GitHub stacking: `init` with the first slice only, then
   `gh stack add` before each subsequent slice. The "two consequences" section is now "why
   not declare all branches up front," with recovery steps for stacks already built that
   way.
3. Corrected the `add` row in the three-commands table — it was described as "only for a
   slice discovered mid-story," a fallback. It is the normal path.
4. Added a `sync` row recording that it silently skips branches without PRs **while
   reporting success**.

This is the third time in two passes that the _first_ correction of a `gh stack` belief was
itself wrong. Pass 6 said the tool cannot grow a stack incrementally; the correction was
"`init` adopts existing and creates missing," which is true and still left the wrong
workflow in place. **Fixing the verdict is not the same as fixing the practice.**
