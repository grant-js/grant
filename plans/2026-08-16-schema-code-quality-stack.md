# Stack plan — `@grantjs/schema` code quality remediation

## Metadata

- **Slug**: `schema-code-quality`
- **Story brief**: [`plans/2026-08-16-schema-code-quality-brief.md`](./2026-08-16-schema-code-quality-brief.md) — approved 2026-08-16, Ale Heredia
- **Findings**: [`docs/contributing/code-quality/schema.md`](../docs/contributing/code-quality/schema.md) — written by slice 6
- **Status**: `merged-to-main` — all six slices merged to trunk (#268, #269, #271, #272, #273, #274), then the trunk merged to `main` as [#275](https://github.com/grant-js/grant/pull/275) (`178dd710`, 2026-08-16). Both gates cleared.
- **Story trunk**: `feat/schema-code-quality`
- **worktree_path**: **not required** — no other story is in flight. All three prior worktrees were pruned on 2026-08-16 after confirming each branch's PR merged (#249, #250, #267); `git worktree list` now shows only the main checkout and `git branch` only `main`. Slices run serially in the main checkout, as in pass 4. Add a worktree only if a second story opens mid-stack.
- **Base**: `main` at `0b2b80aa` (pulled 2026-08-16). `packages/@grantjs/schema` is untouched by anything merged since the assessment, and every `file:line` citation in this plan and the brief re-verifies against this commit.

## Active roles

- [x] Project Manager — gate decisions, slice 6
- [x] Principal Engineer — stack order, integration, worktree
- [x] Architect — slice 6 only (Tier 3 decision 1: SDL as internal declaration language)
- [x] Senior Backend — slices 1, 3, 4, 5
- [x] Senior Frontend — slice 5 only, **blocking on one item**: confirms the 3 unimported operation documents before deletion
- [x] **Senior QA — slice 2, the load-bearing role this story**
- [x] Senior Security — slice 4, blocking, independent of the slice author
- [x] Verifier — after every slice: `type-check`, `lint`, `dead-code:schema`, tests, plus `tsc --noEmit` on `grant-api` and `grant-web`

## Ordered slices (PRs)

| #     | Branch                                      | Base                       | Concern                                                              | Owner              | Review bar        | PR                                                 |
| ----- | ------------------------------------------- | -------------------------- | -------------------------------------------------------------------- | ------------------ | ----------------- | -------------------------------------------------- |
| 1     | `feat/schema-code-quality-guardrails`       | `feat/schema-code-quality` | ESLint DAG rule + `dead-code:schema` + codegen dep fix + drift check | Backend            | light             | [#268](https://github.com/grant-js/grant/pull/268) |
| 2     | `feat/schema-code-quality-structural-tests` | slice 1                    | The coverage lens in this unit's shape — schema-level assertions     | QA                 | light¹            | [#269](https://github.com/grant-js/grant/pull/269) |
| 3     | `feat/schema-code-quality-codegen-dedup`    | slice 2                    | Collapse the 463-type duplicate emission **in `codegen.ts`**         | Backend            | light             | [#271](https://github.com/grant-js/grant/pull/271) |
| 4     | `feat/schema-code-quality-sdl`              | slice 3                    | `me/input` → `me/inputs`; 6 dead SDL declarations                    | Backend            | **security-full** | [#272](https://github.com/grant-js/grant/pull/272) |
| 5     | `feat/schema-code-quality-dead-surface`     | slice 4                    | Hand-written dead exports, duplicate constants, stale config/README  | Backend + Frontend | light             | [#273](https://github.com/grant-js/grant/pull/273) |
| 6     | `feat/schema-code-quality-docs`             | slice 5                    | `schema.md`, Tier 3 decisions, pass table, `CONCEPTS.md`             | Architect + PM     | light             | [#274](https://github.com/grant-js/grant/pull/274) |
| final | `feat/schema-code-quality`                  | `main`                     | integration                                                          | Principal          | **deep**          |                                                    |

¹ ~~Escalates to `security-full` if slice 2's enum↔field check finds a mismatch.~~ **Withdrawn — the mismatch it guarded against cannot occur.** `tsc` already enforces it; see [correction C1](#corrections). Slice 2's bar is plain `light`.

The story→main bar is `deep` on size alone: **776 files import `@grantjs/schema`**, more than any unit audited so far.

### Ordering rationale

The order is not layer order — this is a single-package story, so it is driven by **what verifies what**:

- **Slice 1 before everything.** The rubric's rule: widening a guardrail is the first slice, not the last. It also lands the codegen drift check, which is the acceptance mechanism for slice 3.
- **Slice 2 before slice 4.** The structural tests are what prove the SDL surgery kept the served schema intentional. Moving SDL first and testing after inverts the evidence.
- **Slice 1 before slice 3**, explicitly. The drift check must exist and be _proven to fire_ before the codegen change relies on it. A slice that introduces both its change and the check that validates it has verified nothing.
- **Slice 4 before slice 5.** SDL deletion changes generated output; hand-written cleanup does not. Keeping them apart keeps the security-full review looking at a diff that is only SDL.

### Fan-out

Slices 5 and 6 are file-disjoint from 1–4 and from each other. Slices 1→3 and 2→4 are genuine dependencies as argued above. Default is **serial**, consistent with passes 2–4 and a single-reviewer-bandwidth call.

**The one load-bearing fan-out**: slice 4's Security review must be an independent pass, not evidence the Backend author gathers about their own diff. `apps/api/src/graphql/resolvers/index.ts:36` loads every `.graphql` file in the directory into `makeExecutableSchema`, so a slice that moves or deletes SDL changes the schema the running API serves. Two of the six deletions are `Remove*ProjectApiKeyInput`.

## Stack setup

```sh
git switch -c feat/schema-code-quality main && git push -u origin feat/schema-code-quality
gh stack init --base feat/schema-code-quality \
  feat/schema-code-quality-guardrails \
  feat/schema-code-quality-structural-tests \
  feat/schema-code-quality-codegen-dedup \
  feat/schema-code-quality-sdl \
  feat/schema-code-quality-dead-surface \
  feat/schema-code-quality-docs
gh stack submit
gh stack sync   # after any upstream merge or trunk-only commit
```

Root on `feat/schema-code-quality`, never `main` — omitting `--base` skips gate 4 and turns one release into six. The same applies to `gh stack link` if PRs are adopted mid-flight.

---

## Slice detail

### 1 — Guardrails · light

Four checks, landing together because they are mutually verifying.

**a. ESLint DAG rule.** Add a `packages/@grantjs/schema/src/**/*.ts` scope to `eslint.config.mjs` forbidding **all** `@grantjs/*` imports. Verified clean today: `grep -rn "@grantjs/" src --include="*.ts"` (excl. `generated/`) returns zero.

**Derive the allowed set from this package's own `package.json`, not by copying `core`'s or `database`'s rule.** Pass 4's carried input is the precedent — copying core's verbatim broke the build because `database` legitimately depends on `env` and `constants`. Here the answer is different again and simpler than both: schema has exactly one runtime dependency, `@graphql-typed-document-node/core`, and no `@grantjs/*` dependency at all. The `noAdapterImports(pkg)` helper at `eslint.config.mjs:26` is a starting point, not the rule — schema must also be barred from `core`, `constants`, `env`, and `database`.

**Prove it fires.** Plant a real import (e.g. `@grantjs/core`) in a `src/` file, confirm ESLint errors with the intended message, restore. A green run on a clean tree is indistinguishable from a rule that does nothing.

**b. `dead-code:schema`.** Add `"dead-code:schema": "knip --workspace packages/@grantjs/schema"` to root `package.json`, wire into `.github/workflows/ci.yml` (alongside lines 104–113) and `.husky/pre-push`.

**c. Codegen dependency fix — required for (b) to land green.** `knip` currently reports `@graphql-codegen/client-preset` unused, and `@graphql-codegen/typescript-operations` + `@graphql-codegen/typed-document-node` _unlisted_: `codegen.ts:26` names both plugins, neither is in `package.json`, and they resolve today only through `client-preset`'s transitive tree. Drop `client-preset`, declare the two plugins explicitly, reinstall, regenerate, confirm zero diff. **If the diff is non-zero, stop** — the plugin versions differ from what the transitive tree was supplying, and that is a finding, not something to commit past.

**d. Codegen drift check.** Regenerate and fail on any diff under `src/generated/`. Verified clean today, so it lands green. Prove it fires by editing one SDL field and confirming red. Diff `src/generated/` specifically, not the whole package — `codegen.ts:16`'s `afterAllFileWrite` hook runs `pnpm run format` across the package, and formatting is already `format:check`'s job.

Also resolve knip's config hint on this workspace (`src/index.ts` is a redundant entry pattern under the `packages/@grantjs/*` block).

### 2 — Structural tests · light, escalating

**The coverage lens, run in the shape this unit actually takes.** The package has no tests today, and the honest reading is that its _unit_-testable surface is close to zero: 394 lines of hand-written TS, mostly `as const` arrays and interfaces, and the one piece with logic (`src/events/event-catalog.ts`) is already covered from a consumer at `apps/api/tests/unit/lib/events/event-catalog-coverage.test.ts`. Do not pad this slice with tests for `as const` arrays.

The detector for a codegen package is structural. Add `vitest` + a `test` script, then:

- **The merged SDL from `src/schema/**` builds.** Today this is only proven at API boot.
- **All 116 documents under `src/operations/**` validate against it.**
- ~~**Every `*SortableField` and `*SearchableField` enum value is a real field on its entity type.** This is the slice's reason to exist.~~ **Not built — the compiler already does it.** See [correction C1](#corrections). Repositories assign `Object.values(XSearchableField)` to `searchFields: Array<keyof XModel>`, and TypeScript rejects any enum value that is not a key of the Drizzle model. A test would have been a weaker copy of a check that already blocks CI.
- **A reachability report from `Query`/`Mutation`** pinning the current unreachable count, so slice 6's Tier 3 decision has a number that moves. The audit's grep said 177 of 382 declarations; that is a **lower bound** measured against SDL cross-references, and the real figure from graph traversal will differ. Report what the traversal says, not what the brief said.

**Two carried inputs bite hardest here.** `vi.resetModules()` plus a large barrel import is quadratic and fails first in CI — pass 4's `connection.test.ts` went from 7,695 ms to 175 ms once the barrel was `vi.mock`ed. This package _is_ barrel-shaped by construction (21,802 generated lines across three files). And **mutation-check every test before counting it**: a characterization test that has never failed characterizes nothing. Include `vi.clearAllMocks()` in `beforeEach` if any spy is used.

### 3 — Codegen de-duplication · light

`codegen.ts:34` runs the `typescript` plugin alongside `typescript-resolvers`, so `src/generated/resolvers.ts` (7,347 lines) re-emits **463 of the 464** type names already in `src/generated/schema-types.ts` (3,812 lines).

**The fix is in `codegen.ts`, and the precedent is eight lines above the problem.** `codegen.ts:25-31` already sets `importSchemaTypesFrom: './src/generated/schema-types'` for the operations output, which is why `graphql.ts` opens with `import type * as Types from './schema-types'`. The comment at `codegen.ts:24` records that someone hit this exact failure mode there and worked around it. The resolvers output never got the same treatment.

**Acceptance is a clean regeneration, not a clean diff review.** `src/generated/**` is never hand-edited — a hand-deletion is undone by the next `pnpm generate`, and slice 1's drift check will correctly fail on it. After the config change, run `generate` twice: the output must be idempotent, the drift check green, and `resolvers.ts` must no longer declare the 463 names `schema-types.ts` owns.

**Then `src/index.ts:4-27`.** Its hand-curated 23-name resolver export list is a symptom of the collision, not a policy. With the collision gone, replace it with a normal re-export. Note this _widens_ the exported surface from 23 `*Resolvers` types to 116 — if that is not wanted, keep an allowlist **deliberately** and write down why, rather than inheriting one by accident.

**If codegen v7 cannot express this** (`import-types` preset, `importTypesNamespace`, or equivalent — validate, do not assume), **that is the finding**: record what was tried and why it failed, keep the current output, close the slice. A hand-deletion is not the fallback.

`pnpm --filter grant-api exec tsc --noEmit` is the real gate — `apps/api` is the only consumer of the resolver types, and per pass 3's carried input, when the compiler can distinguish the change, the compiler is the review.

### 4 — SDL surgery · security-full

**a. Merge `src/schema/me/input/` into `src/schema/me/inputs/`** — 10 files (`change-my-password.graphql`, `update-my-user.graphql`, …) into the directory holding the 4 MFA inputs. It works today only because `loadFilesSync` recurses. Of the 54 domains, 50 have an inputs directory and **every one of them spells it `inputs/`** — `me` is the only domain carrying both spellings. (The remaining 4 have no inputs directory at all.)

**The merged schema must be byte-identical afterwards.** Verify with slice 1's drift check and slice 2's SDL-builds test, not by inspection.

**b. Delete the 6 declarations that are unreferenced in SDL and in all TypeScript**: `AccountSearchableField`, `Creatable`, `OrganizationMemberSearchableField`, `RemoveAccountProjectApiKeyInput`, `RemoveOrganizationProjectApiKeyInput`, `UpdateMyUserAuthenticationMethodInput`. Confirmed with a repo-wide grep whose only remaining hits were `.next/` build artifacts.

**Re-derive before deleting.** In particular, do not extend this to the other 171 SDL-unreachable declarations: 171 are live TypeScript consumed by `apps/api`, and 12 of the 14 `*SearchableField` enums are live _runtime_ configuration. That distinction is the whole Tier 3 finding and it is slice 6's decision, not this slice's cleanup.

Security reviews this slice independently of the author. The question to answer is not "are these six unused" but "what changes in the schema the API serves, and can any client observe it."

### 5 — Hand-written dead surface · light

Counted by the edit each implies (rule 4), all in hand-written files — nothing here touches `src/generated/**`:

- **Drop the `export` keyword** (the file still uses the symbol): `AUDIENCE_PRIMITIVES`, `AudienceRule`, `EventCatalogEntry`, `EVENT_DELIVERY_CLASSES`.
- **Delete the declaration**: `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES` — zero external importers, and each duplicates a `@grantjs/database` constant backed by a SQL `CHECK` (`notifications.schema.ts:19`, `notification-preferences.schema.ts:15,18`, `webhook-delivery-attempts.schema.ts:21`). These are the middle of three copies. **Do not "fix" this by having schema import from database** — that would invert the DAG and slice 1's new ESLint rule will stop it. Deleting the unused copy is the whole fix; `apps/api`'s third copy of the literals is an `apps/api` finding, recorded not actioned.
- **Leave alone**: `ProjectAppScopeInfo`, `ProjectConsentInfoUser` — field types of exported interfaces.
- **Delete `tsconfig.build.json`** — never referenced; `build` is plain `tsc`, which reads `tsconfig.json`. Confirm no build path reads it first: "no references" is weak evidence for a config file (pass 4's `drizzle.config.cjs` lesson). Note every other package carries one too, so establish whether this is schema-specific or repo-wide before deleting — if repo-wide, delete only schema's and record the rest as owed to pass 6.
- **Correct `README.md`** — it documents a `pnpm generate:watch` script that does not exist (it is `dev`) and a `src/` layout with `generated/types.ts`, `generated/operations.ts` and a `types/` directory, none of which are real.

**Frontend, blocking**: resolve the 3 unimported operation documents — `GetOrganizationInvitationsDocument`, `GetRoleDirectPermissionsDocument`, `GetUserDirectPermissionsDocument`. Rule 7's ambiguity applies to operation documents as much as to validators: an unused document means either "superseded" or "the UI was never built." Confirm which before anything is deleted. If the answer is "never built," the deletion is correct _and_ worth a line in `schema.md` — an abandoned feature is a different finding from clutter.

### 6 — Findings, decisions, and the pass record · light

- **Write `docs/contributing/code-quality/schema.md`**, evidence-first with `file:line` citations, and flip pass 5 to Done in the pass table (`docs/contributing/code-quality/README.md:167`).
- **Record the two structural caveats** the audit surfaced, because they change how the next reader interprets the numbers: (a) `knip` is structurally blind on this package — `knip.json`'s `entry: ["src/index.ts"]` makes every re-export "used," so its zero-unused-exports result means "not measurable this way," not "clean"; (b) the SDL-unreachable count is a lower bound and a misleading headline, since 171 of 177 are live TypeScript and 12 of 14 `*SearchableField` enums are live runtime config.
- **Three Tier 3 decisions, recorded either way** (code change out of scope):
  1. **The 36 graph-less domains** (of 54) — is SDL the right declaration language for internal junction types and repository search config, given `makeExecutableSchema` ships all of them in the served schema? Architect owns this. Options and cost, not execution. Note the mitigating fact: introspection defaults off in production (`apps/api/src/config/env.config.ts:358`), but the SDL ships in the published npm package regardless.
  2. **Operation file naming** — 63 camelCase vs 53 kebab-case, against 430 consistently kebab-case files under `src/schema/`. Pick one, document it. Renaming 63 files touches every consumer import, so it is its own story if approved.
  3. **GraphQL description policy** at 35 of 430 files (8%). `.cursor/rules/schema.mdc:17` asks for tier-A descriptions "when the name alone is insufficient" — a judgement rule. Decide the bar; do not backfill 400 files.
- **Carry forward to pass 6** in the README's inputs table: the guardrails now reach `schema` and stop there; and the AGENTS.md package-graph gap below.

---

## Dependencies / notes

**State of the tree at planning time** (re-checked against `main` @ `0b2b80aa`, 2026-08-16):

**Nothing is in flight and there is no collision.** All three previously-open branches merged — `chore/deps-security-bumps` ([#249](https://github.com/grant-js/grant/pull/249), 2026-08-10), `fix/codeql-security-alerts` ([#250](https://github.com/grant-js/grant/pull/250)), `feat/database-cq-followups` ([#267](https://github.com/grant-js/grant/pull/267)) — and their worktrees and local branches were pruned on 2026-08-16 after confirming each PR's merged state. `main` @ `0b2b80aa` already carries the dependency pins (`package.json:138-139`), so the lockfile conflict this plan originally flagged does not exist.

**A method note worth keeping, because it produced a wrong call during planning.** `git diff main...<branch>` (three-dot) diffs against the _merge base_, so a squash-merged branch still shows its full diff and looks unmerged; `git merge-base --is-ancestor` fails for the same reason. Both reported `chore/deps-security-bumps` as open when it had merged six days earlier. **Check the merged state against main's actual content or the PR, not against branch ancestry** — in this repo every PR is squash-merged, so ancestry checks are structurally unreliable.

No file overlap remains: nothing merged since the assessment touches `packages/@grantjs/schema`, `eslint.config.mjs`, `knip.json`, `.husky/pre-push`, `.github/workflows/ci.yml`, or `docs/contributing/code-quality/README.md`. Slice 1 and slice 2 still both modify `pnpm-lock.yaml` (the codegen dependency fix and `vitest` respectively); with nothing racing them the standing rule is enough — **regenerate the lockfile, never hand-merge it.**

**Verifier gate on every slice**: `pnpm --filter @grantjs/schema type-check`, `lint`, `dead-code:schema`, the new tests, plus `pnpm --filter grant-api exec tsc --noEmit` and `pnpm --filter grant-web exec tsc --noEmit`. The two app-level checks are not optional on any slice touching exports or SDL — 776 files import this package, and `apps/web` alone accounts for a large share.

---

## Judgment calls for gate 2 {#judgment-calls}

1. **`schema.md` is written last, in slice 6, not first.** The brief made it acceptance criterion 1, which reads as "write it first." I have put it last deliberately: its two headline numbers (SDL reachability, and whether the enum↔field check finds a mismatch) are _produced_ by slice 2, and its Tier 3 section records decisions that don't exist until slice 6. Writing it in slice 2 and amending it in slice 6 means two slices editing one large file in a stack. The cost of this call is that slices 1–5 run with the brief as their evidence base rather than a findings doc. Overrule me if you'd rather have the doc up front — it is a one-slice reorder, not a redesign.
2. ~~**Slice 2's bar is deliberately conditional.**~~ **Resolved to plain `light`** once the check it hedged against turned out to be redundant — [correction C1](#corrections).
3. **Slice 3 can legitimately close having changed nothing.** If codegen v7 cannot express the de-duplication, the correct outcome is a recorded negative result, not a hand-edit of generated files. I would rather the slice land empty-but-documented than have someone "fix" 3,800 lines in a way the next `pnpm generate` reverts. Calling it out because an empty slice looks like a failed slice at review time, and here it isn't.
4. **The 171 SDL-unreachable-but-live-TypeScript declarations are untouched by every slice.** They are 46% of the SDL and the largest question in the package. Slice 6 decides; nothing executes. Deciding and acting in the same pass is exactly what Tier 3 exists to prevent — and here the acting would be a contract change across 776 importers.
5. **No slice widens guardrails beyond `@grantjs/schema`**, even though slice 1 is touching `eslint.config.mjs` and `ci.yml` anyway and it would be cheap. Same rule passes 1–4 each wrote: a repo-wide widening surfaces violations this story has no mandate to fix. Pass 6's first slice.
6. **Discovered out of scope, flagged for a human before pass 6 is planned**: `AGENTS.md`'s package dependency graph lists 11 packages; the repo has 19. Undocumented: `analytics` (2 importers), `cli` (0), `client` (**117**), `i18n` (17), `platform` (0), `server` (1), `telemetry` (2), `webhooks` (3). Consequently `docs/contributing/code-quality/README.md:168` under-scopes pass 6 — its adapter list omits eight packages, two of which (`cli`, `platform`) have zero importers and may be dead units rather than audit targets. This is the same class of correction pass 4 made for `env` and `constants`, and considerably larger. It does not belong in a `@grantjs/schema` story; it should be a short Architect-owned doc story of its own.
7. **Resolved before approval, kept for the record**: this plan originally flagged a lockfile collision with `chore/deps-security-bumps` and recommended landing it first. That branch had already merged as #249; the collision never existed. See the method note under [Dependencies](#dependencies--notes) — squash merges make branch-ancestry checks unreliable, and that is what produced the false reading.

## Corrections {#corrections}

Claims in this plan or the brief that implementation disproved. Recorded in flight rather than at close-out, so a slice never runs against a premise a previous slice already killed. Carried into `schema.md` at slice 6.

### C1 — the `*SearchableField` enum check was redundant (slice 2)

**Claimed**: an enum value that is not a column degrades column search silently — "no type error, no runtime error, just fewer rows matched" — making this the one plausible live defect in the package, worth a test and a conditional `security-full` bar.

**Actual**: `tsc` rejects it. Repositories write `protected searchFields: Array<keyof GroupModel> = Object.values(GroupSearchableField)`, and a string-enum member is not assignable to a `keyof` union it is not in. Planting `notAColumnAtAll` into `GroupSearchableField` and regenerating produces:

```
groups.repository.ts(25,13): error TS2322: Type 'GroupSearchableField[]' is not assignable to
  type '("createdAt" | "updatedAt" | "description" | "name" | "id" | "searchDocument" | ...)[]'
    Type 'GroupSearchableField.NotAColumnAtAll' is not assignable to ...
```

**Why it was wrong**: the claim assumed a positional/structural gap without checking assignability — the precise failure pass 3 recorded as a carried input and this plan quoted approvingly one slice earlier ("when the compiler can distinguish the change, the compiler is the review"). Quoting a rule is not applying it.

**Two things the investigation surfaced that are worth keeping:**

- The enums are contracts against the **Drizzle model, not the graph**. `GroupSearchableField.searchDocument` is a real column (`packages/@grantjs/database/src/schemas/groups.schema.ts:12`) and _not_ a field on the `Group` GraphQL type. An SDL-only version of this check would have failed on correct code.
- The one consumption path that is not a `keyof` assignment — the sort switch at `apps/api/src/repositories/organization-members.repository.ts:178` — has a `default:` arm falling back to name-sort, so an unknown value degrades rather than breaks.

**Disposition**: check not built; slice 2's bar is plain `light`; footnote 1 and judgment call 2 withdrawn. `AccountSearchableField` and `OrganizationMemberSearchableField` remain genuinely dead (no consumer at all, hence nothing for the compiler to check) and are still on slice 4's deletion list.

### C2 — SDL reachability is 181, not 177 (slice 2)

The brief's 177 came from grepping SDL cross-references and was labelled a lower bound. Graph traversal from `Query`/`Mutation` gives **181 of 388 declared types** (46.6%). 181 is now pinned by `src/sdl-contract.test.ts`; 177 should not be cited again.

### C3 — `tsconfig.build.json` was not dead config, and deleting it broke e2e (slice 5)

**Claimed**: unreferenced, since `build` is plain `tsc` reading `tsconfig.json`, and the only in-repo references were `@grantjs/server` and `@grantjs/cli` pointing at their own from `vite.config.ts`.

**Actual**: `scripts/docker/build-api-production.mjs:66` composes the path dynamically — `join(absDir, 'tsconfig.build.json')` — and **throws** if it is absent, for each of the 15 packages in `WORKSPACE_PACKAGES`. `@grantjs/schema` is the first entry. CI failed at the E2E stage with `Error: Missing tsconfig.build.json for packages/@grantjs/schema`.

**Why it was wrong — and it is not the reason it looks like.** The plan quoted pass 4's `drizzle.config.cjs` lesson verbatim ("no references is weak evidence for a config file") and the search was actually run with the right patterns, including `*.mjs`. It was piped through `head`, and `scripts/docker/build-api-production.mjs` sat below the cut. **A truncated result read as a complete one.** That is rule 1's corollary — prove the check fires — applied one level up: verifying the tool ran is not the same as verifying you saw all of its output. Never pipe an existence check through `head`.

The `vite.config.ts` hits made the truncated list look self-explanatory, which is what stopped the search. A partial answer that forms a coherent story is more dangerous than no answer.

**Disposition**: file restored, plus an `exclude` for `src/test-support/` — the same investigation showed slice 2's fixture module was compiling into the production image. Note the child `exclude` **replaces** the inherited one rather than merging, so the parent's `*.test.ts` patterns had to be restated; the first attempt at the fix made the leak worse and was caught by checking `dist/` rather than assuming.

**A second claim fell with it.** `schema.md`'s backlog said `apps/api/src/graphql/resolvers/index.ts`'s `dist/schema` candidate "can never exist, `tsc` does not copy `.graphql`". It does exist in the production image: schema is registered as `{ dir: 'packages/@grantjs/schema', assets: ['src/schema'] }` and the script's `copyAssets` copies the SDL to `dist/schema`. That fallback chain is correct, not brittle. Backlog entry replaced.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-08-16, Ale Heredia. Implementation may proceed, slice 1 first.
- [x] Gate 3: Stack PRs merged into trunk — 2026-08-16, all six green including e2e.
- [x] Gate 4: Story → `main` deep review complete — merged as #275, 2026-08-16.

## Cleanup

- [x] Local slice branches deleted — none existed; slices ran serially in the main checkout, so `git branch` showed only `main` at close-out.
- [x] Remote slice branches deleted — all 7 (`feat/schema-code-quality` + six slices), each confirmed `MERGED` via `gh pr list --head <branch> --state all` rather than by ancestry, per the method note under [Dependencies](#dependencies--notes).
- [x] Worktree removed — none was added; `git worktree list` showed only the main checkout throughout.
- [x] Stack plan status → `merged-to-main`

## Carried out of this pass

Open at close-out, tracked in [`schema.md` § Backlog](../docs/contributing/code-quality/schema.md#backlog):

| Item                                                                    | Disposition                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `@grantjs/database` leaks `src/test-support/` into the production image | **Adopted by pass 6** — and the backlog's stated fix is wrong; see the correction below |
| Two `tsconfig.build.json` dialects across `packages/@grantjs/*`         | **Adopted by pass 6** (discovered at close-out, not during the pass)                    |
| D1 — 62 `src/operations/*.graphql` renames to kebab-case + lint rule    | Own story. Explicitly **not** pass 6                                                    |
| D4 — `apps/api`'s third copy of the status literals                     | Own `apps/api` slice. Explicitly **not** pass 6                                         |
| D0 — SDL as an internal declaration language                            | Open, Architect-owned. Explicitly **not** pass 6                                        |

### C4 — the `test-support` leak fix does not live in the shared parent (close-out)

**Claimed** (`schema.md` § Backlog): "the shared `packages/@grantjs/tsconfig.build.json` excludes `*.test.ts` but not `src/test-support/` … the durable fix is one pattern in the shared parent."

**Actual**: `packages/@grantjs/database/tsconfig.build.json:2` extends `./tsconfig.json`, **not** `../tsconfig.build.json`. Adding a pattern to the shared parent would not reach `database` at all — the one package the backlog entry was written about. Of the 19 packages carrying a `tsconfig.build.json`, **11 extend the shared parent and 6 extend their own** (`client`, `cli`, `core`, `database`, `env`, `server`; `schema` extends the parent and restates its patterns per C3).

**Why it was wrong**: the entry was written from schema's vantage point — schema does extend the parent — and generalised without checking the other extends-chains. The same shape as C3: a claim true of the file in front of you, asserted about the set.

**Disposition**: the leak is real and unfixed; the fix is two edits, not one, and the dialect split is itself a finding. Both handed to pass 6.
