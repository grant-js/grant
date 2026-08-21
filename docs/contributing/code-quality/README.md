# Code quality passes

A repeatable audit for one workspace unit at a time — `apps/api`, `apps/web`, `packages/@grantjs/core`, `packages/@grantjs/database`, `packages/@grantjs/schema`, and the adapter packages.

The goal is **consistency**, not perfection. `AGENTS.md` already defines the layering rules, and CI enforces the build. What these passes catch is everything the rules do not mechanically prevent: the same block copied into forty files, five implementations of pagination, exports nobody imports, and two names for one concept.

## Method

One unit per pass. Each pass produces a findings document in this directory named after the unit (`api.md`, `web.md`, …) and, when it surfaces actionable work, a story brief and stack plan under `plans/`.

Findings are **evidence-first**. Every claim cites `file:line`. A finding without a citation is an opinion and does not belong in the document.

Eight rules learned the hard way on pass 1 (see [its corrections table](./api.md#corrections)):

1. **Run the tool before stating a count.** Grep finds instances; a type-aware lint rule finds the pattern. Pass 1 reported one un-awaited promise and there were thirteen, and ~115 dead exports where there were 361. If a rule exists for the finding, run it — and prefer reporting "the rule reports N" over "I found N".
2. **A rule violation is not automatically a defect.** Before filing, check for an intentional design: a sentinel protocol with a mapping layer, a constant mirroring a database constraint, an adapter port that only looks misfiled. Five of pass 1's findings were correct code and an incorrect reading.
3. **"Mechanical" is a claim to test, not assume.** Size the work by opening the hardest instance, not the easiest. One pass-1 item scoped as an import fix turned out to require moving type ownership between packages.
4. **Count findings by the edit they imply, not by the tool's issue type.** knip's "unused export" covers three edits with different risk: deleting a barrel line whose implementation is alive, dropping an `export` keyword from a symbol its own file still uses, and deleting a declaration. Only the last removes behaviour. Reported as one number, a slice looks far more dangerous than it is — and the safest, largest group (encapsulation) disappears into it.
5. **State the tool's blind spots next to its output.** knip reads module exports, so it sees neither class members nor string-resolved references. Both bit pass 1: 13 dead methods it never looked at, and a dependency (`pino-pretty`, named only as a pino transport target) that it called unused and that nothing but a runtime smoke test would have caught.
6. **Size a proposed helper against the block it replaces at the call site — not against the total line count.** "N files × M lines" is the size of the _pattern_, not the size of the _saving_. Four of pass 1's extractions were rejected once opened: the repeated span turned out to be a whole method whose varying part was already shorter than the helper call would be. Before proposing, normalize the entity name away, diff two real instances, and quote what actually remains at one call site after the extraction.
7. **A validator with no callers is ambiguous evidence.** Dead-code tooling reports an unused validator identically whether the validation was superseded or is simply _missing_ everywhere it should run. Pass 1 had both at once: two genuinely dead "safe" validation helpers, and twelve services that call no input validation at all — the second invisible to every tool. Resolve which one you are looking at before deleting.
8. **Coverage is a detector, not just a safety net.** Writing tests for pass 1's untested base classes surfaced three latent defects in code the other six lenses had already scored clean, none of them reachable by grep. Treat lens 7 as a source of Tier 0 findings, not only as a backlog item.

A corollary to 1: **verify the tool ran at all.** A helper that shelled out to `rg` silently returned zero matches for every symbol, because `rg` is a shell function in this environment and does not exist for child processes. A checker that finds nothing looks identical to a clean codebase. Prove the check fires by planting a violation before trusting a green result.

Findings are **tiered by decision type**, not by severity alone — this is what makes a pass actionable:

| Tier | Meaning                                            | Default disposition                     |
| ---- | -------------------------------------------------- | --------------------------------------- |
| 0    | Correctness bugs found while auditing              | Fix — they are real defects             |
| 1    | Violations of rules already written in `AGENTS.md` | Fix mechanically, then lint             |
| 2    | Repetition that a helper would collapse            | Propose, size, let a human choose       |
| 3    | Multiple styles for one concern                    | Decide on one, document it              |
| 4    | Dead surface                                       | Delete                                  |
| 5    | Ubiquitous-language drift                          | Glossary first, rename later (or never) |
| 6    | Coverage gaps                                      | Backlog, weighted by lines at risk      |

Tiers 0–1 are objective. Tiers 2–3 need a human decision on appetite. Tier 5 usually touches public contracts and should never be actioned inside the same pass that discovers it.

## The seven lenses

Run each lens against the unit under audit. Commands assume repo root and `rg` (ripgrep).

### 1. Layer integrity

Does the dependency direction in `AGENTS.md` hold? For `apps/api` that is `Transport → Handlers → Services → Repositories → Database`, with the composition root as the only wiring site. For packages it is the DAG — `schema → core → adapters`, no cycles.

```bash
rg -n "repositories/" apps/api/src/handlers apps/api/src/rest apps/api/src/graphql
```

A clean result is worth recording explicitly. Knowing a boundary holds is what makes it cheap to lock in with a lint rule.

### 2. Import discipline

The symbol/source table in `AGENTS.md` — `@/lib/logger` not `@grantjs/logger`, `@/lib/errors` not `@grantjs/core`, `@/types` not `@/services/common`, aliases not deep relatives.

```bash
rg -n "from '@grantjs/(logger|errors)'" apps/api/src
rg -n "from '\.\./\.\./" apps/api/src
```

Sanctioned re-export sites (`src/lib/logger/`, `src/lib/errors/`) are not violations. Note them so the next pass does not re-flag them.

When a rule turns out to be **unfollowable** — the compliant path does not exist — that is a Tier 0 finding against the rule, not a Tier 1 finding against the code.

### 3. Repetition

Near-identical blocks across three or more files. Normalize the entity name away before comparing, or every CRUD file looks unique:

```bash
# Compare two services with the entity name normalized out
diff <(sed 's/[Gg]roup//g' apps/api/src/services/groups.service.ts) \
     <(sed 's/[Rr]ole//g'  apps/api/src/services/roles.service.ts)
```

Report the **count of affected files** and the **line span** of the repeated block. "43 services share a 30-line block" sizes the work; "there is duplication in the services layer" does not.

Also check whether a base class or helper already exists and which files opt out of it. An unused abstraction is a finding.

### 4. Single-style

For each cross-cutting concern, count the distinct implementations. Concerns worth checking in this repo: pagination, tenant scoping, soft delete, audit logging, domain events, cache keys, zod validation, transactions.

```bash
rg -n "hasNextPage" apps/api/src --type ts
rg -n "validateInput" apps/api/src/services | cut -d: -f1 | sort -u
```

Two styles is drift. Five is a decision nobody has made yet.

### 5. Dead surface

Exports appearing exactly once — at their own definition.

```bash
rg -n "^export (const|function|class|type|interface) (\w+)" -or '$2' apps/api/src \
  | sort -u \
  | while read -r sym; do
      n=$(rg -cw "$sym" apps/api/src apps/api/tests apps/web/src packages 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')
      [ "$n" -le 1 ] && echo "$sym"
    done
```

Cross-reference against `apps/`, `packages/`, and tests before declaring anything dead. Orphaned schemas whose endpoint was never built are worth calling out separately — they signal an abandoned feature, not just clutter.

**Validators are the exception to "unused means delete."** A guard with no callers reports identically whether it was superseded or whether the call it guards is missing everywhere. Cross-check against lens 4 before removing one:

```bash
# Which services never validate their input at all?
for f in apps/api/src/services/*.service.ts; do
  grep -q "validateInput" "$f" || echo "$(basename "$f") $(wc -l < "$f")L"
done
```

If that list is non-empty, an unused validator is a candidate _call site_, not a candidate deletion. Pass 1 deleted two dead validation helpers correctly while twelve services validated nothing — the second fact was invisible to the tool and had to be measured separately.

### 6. Ubiquitous language

One term per concept, consistent from database column through service and port to the transport surface. Grep candidate synonyms and check where the term changes:

```bash
rg -c "organizationId|orgId" apps/api/src
```

Record findings in [`CONCEPTS.md`](https://github.com/grant-js/grant/blob/main/CONCEPTS.md) with a citation for each competing spelling. **Do not rename in the same pass.** Terms that reached the GraphQL schema, REST paths, or persisted data are contracts; changing them is its own story with its own risk assessment.

### 7. Coverage

Which layers have tests, weighted by lines rather than file count — 8,000 untested lines in one directory matter more than twelve untested one-liners.

```bash
find apps/api/src/rest/routes -name '*.ts' | xargs wc -l | tail -1
find apps/api/tests -name '*routes*' | wc -l
```

Shared base classes deserve particular attention: an untested base class is a defect multiplier across every subclass.

**Run this lens as a detector, not as a backlog item.** The other six lenses read code; this one executes it, which is why it finds what they cannot. Writing characterization tests for pass 1's untested base classes produced three Tier 0 findings — a filter that widens silently on a misspelled operator, a pivot `countActive({})` that counts the entire table, and a config branch that can never fire — in code the earlier lenses had scored clean.

So when the audit's untested surface includes anything shared, **write the tests during the pass** rather than filing them. Characterize first: assert what the code does today, including the parts that look wrong, then decide separately whether each is a defect. Two of pass 1's three findings were pinned as-is because the fix was a product decision rather than a bug fix.

## Enforcement

A finding that can be checked by a script should become a check, or the next pass rediscovers it. Prefer, in order:

1. **A lint rule** — `no-restricted-imports` for the import table, `no-floating-promises` for un-awaited async, `eslint-plugin-boundaries` or `dependency-cruiser` for the layer DAG.
2. **A CI step** — `knip` or `ts-prune` for dead exports.
3. **A documented convention** — only when neither of the above can express it.

Locking in a lens that currently passes costs nothing and is the highest-value output of a pass. Do it while the result is green.

## Writing the findings document

Keep it scannable. Tables over prose for anything countable. Lead with what holds — a pass that opens with a list of failures misrepresents a codebase whose architecture is sound and whose problem is repetition.

State counts precisely (`7 violations`, not `several`). Where a rule is violated in one file but followed in another file for the same concern, cite both — internal inconsistency is stronger evidence than an absolute count.

## Passes

| Pass | Unit                                           | Status      | Document                                         |
| ---- | ---------------------------------------------- | ----------- | ------------------------------------------------ |
| 1    | `apps/api`                                     | Done        | [api.md](./api.md)                               |
| 2    | `apps/web`                                     | Done        | [web.md](./web.md)                               |
| 3    | `packages/@grantjs/core`                       | Done        | [core.md](./core.md)                             |
| 4    | `packages/@grantjs/database`                   | Done        | [database.md](./database.md)                     |
| 5    | `packages/@grantjs/schema`                     | Done        | [schema.md](./schema.md)                         |
| 6    | The 12 internal `@grantjs/*` packages          | Done        | [internal-packages.md](./internal-packages.md)   |
| 7    | The published trio — `client`, `server`, `cli` | Done        | [published-packages.md](./published-packages.md) |
| 8    | `apps/config`                                  | Not started | —                                                |

**The unit list is now complete and the remainder is named.** Pass 6 corrected the roster twice: `AGENTS.md` documented 11 packages against a real 18 (19 before `platform` was deleted), and pass 5's own correction of that number was itself incomplete — it filed `cli` as a possible dead unit when it is a published product. What is left is two units of genuinely different shape: the **published trio** (`client`, `server`, `cli`), where every export is semver-public and "unused" may mean "used by a downstream consumer you cannot grep", and **`apps/config`**, a third Next.js app of 4,839 lines that appeared in no pass table, no roster, and no carried input until pass 6 went looking.

Order is not fixed. Pass 2 confirmed the rubric's central claim — the method transfers to another unit, including its lens-fan-out and its "run the tool before stating a count" rule, which is exactly what caught pass 2's own slice-4 undercount. Which package is next is an open choice; `packages/@grantjs/core` sits lowest in the dependency DAG and has the widest blast radius if its findings turn out contract-shaped.

### Inputs carried into later passes

A pass that scopes its own fixes narrowly leaves work for the unit that comes next. Record it here when it happens, or it survives only in a closed story's slice detail.

| From   | Owed to                    | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pass 1 | Pass 2 and every later one | **The guardrails stop at `apps/api`.** 11 rule blocks in `eslint.config.mjs` are scoped to `apps/api/**`, and `dead-code:api` is `knip --workspace apps/api`. Pass 1 scoped them deliberately — a full-repo run would have surfaced violations it had no mandate to fix. Each unit's own pass widens them to itself                                                                                                                                                                                                     |
| Pass 1 | Pass 2                     | The lens-5 validator cross-check and the lens-7 detector instruction are written against `apps/api` paths. They are the two lenses whose commands need rewriting per unit                                                                                                                                                                                                                                                                                                                                               |
| Pass 2 | Pass 3 and every later one | **The guardrails still stop short of `packages/`.** After pass 2, `eslint.config.mjs` and `dead-code:*`/pre-push cover `apps/api/**` and `apps/web/**` only — `packages/@grantjs/*` has neither. Same rule as pass 1's own entry above: widen it as the next pass's first slice, don't audit by hand what the tool would count exactly                                                                                                                                                                                  |
| Pass 2 | Pass 3                     | Pass 2 confirmed a pass's condensed slice briefs are a starting estimate, not a ceiling — slice 4's actual diff (96 files) was ~19x the plan's named example count once the implementing agent re-ran `knip` itself. Size independent-review effort by the diff a slice actually produces, not by what its plan entry said it would be                                                                                                                                                                                  |
| Pass 3 | Pass 4 and every later one | **The guardrails now reach `packages/@grantjs/core` — and stop there.** Pass 3 added a `core`-scoped `no-restricted-imports` DAG rule (`eslint.config.mjs:359`) and `dead-code:core`, but both name `core` explicitly rather than globbing `packages/@grantjs/*`. Deliberate: a repo-wide widening would have surfaced violations pass 3 had no mandate to fix. Each remaining package pass widens them to itself — the same rule passes 1 and 2 wrote, now with a working per-package template to copy                 |
| Pass 3 | Pass 4 and every later one | **A guardrail that passes is not a guardrail that works.** Pass 3's close-out planted a real reverse-DAG import in `core/aal.ts` and confirmed the new rule errored on it, rather than trusting a green lint run — the rubric's "prove the check fires" corollary applied to a rule the same pass had just written. Do this for every guardrail a pass adds; the cost is one throwaway edit and it is the only thing separating "the rule works" from "the rule is syntactically valid"                                 |
| Pass 3 | Pass 4 and every later one | **Weigh a positional-signature change by type distinguishability, not by the reorder.** Pass 3 flagged `AuthorizationError`'s argument reorder `security-full` on the assumption that positional reorders break silently. They don't when the adjacent types are incompatible — `Error` isn't assignable to `Record<string, unknown>`, so `tsc` caught what a human audit was scheduled to catch. Check assignability between the swapped positions first; if they're mutually incompatible, the compiler is the review |

| Pass 4 | Pass 5 and every later one | **The guardrails now reach `@grantjs/database` too, and the per-package rule finally has a shared helper.** `eslint.config.mjs` hoists `ADAPTER_PACKAGES` + `noAdapterImports(pkg)` to module scope, so each new package's DAG rule is one `files`/`paths` block rather than a copied list. Note what pass 4 found when it copied core's rule verbatim: **the build broke.** `database` legitimately depends on `@grantjs/env` and `@grantjs/constants`, which core must not touch. Derive each package's allowed set from its own `package.json` `dependencies`; the DAG is not one rule applied N times |
| Pass 4 | Pass 5 and every later one | **A characterization test that has never failed characterizes nothing.** Pass 4 inherited an assertion that could not fail — it asserted on `.filter()`'s return (always an array) against a field the recorded insert never had. It passed, it was counted in the coverage number, and it pinned no behavior. The fix is the rule-1 corollary applied to tests: **mutate the code under test and confirm the test goes red** before counting it. Pass 4 mutation-checked all 89; the practice cost minutes and invalidated one test that three reviewers had read past |
| Pass 4 | Pass 5 (`@grantjs/schema` especially) | **`vi.resetModules()` + a large barrel import is quadratic, and it fails first in CI.** Pass 4's `connection.test.ts` re-imported the 110-table schema barrel once per test and blew vitest's 5s default — green locally, red in CI. `vi.mock`-ing the barrel took the file from 7,695 ms to 175 ms. `@grantjs/schema` is codegen'd and barrel-shaped by construction, so budget for this rather than raising the timeout — a raised timeout hides the cost instead of removing it |
| Pass 4 | Pass 5 and every later one | **`vi.spyOn` on an already-spied method returns the _existing_ spy.** Without `vi.clearAllMocks()` in `beforeEach`, call counts accumulate across every test in the file — pass 4 saw 150 recorded warnings where 6 were expected, and the assertions that "passed" were reading other tests' calls. This is the same failure mode as the vacuous assertion, one layer down: the test ran, the number was wrong, and nothing complained |

| Pass 5 | Pass 6 | **Pass 6's unit list is wrong, and that has to be fixed before it is planned.** `AGENTS.md`'s package dependency graph lists 11 packages; the repo has **19**. Undocumented: `analytics` (2 importers), `cli` (0), `client` (**117**), `i18n` (17), `platform` (0), `server` (1), `telemetry` (2), `webhooks` (3). So the old "adapter packages (`cache`, `storage`, `email`, `jobs`, `logger`, `errors`)" line omitted eight packages — one of which (`client`) has more importers than `@grantjs/database`, and two of which (`cli`, `platform`) have zero and may be dead units rather than audit targets. Pass 4 made the same class of correction for `env` and `constants`; this one is larger and wants an Architect-owned doc story **before** pass 6 is scoped |
| Pass 5 | Pass 6 and every later one | **Ask what the _generator_ would have to be told, not what the code should look like.** Pass 5's largest win was one `codegen.ts` change that removed 3,780 duplicated lines — a defect that had been visible for a long time as code (a duplicate emission plus a hand-curated allowlist working around it) and invisible as configuration. For any generated artifact, a hand-edit is reverted by the next run; the fix is upstream. Corollary on ordering: land the drift check **before** the change that depends on it, or the slice validating itself has validated nothing |
| Pass 5 | Pass 6 and every later one | **`knip` cannot measure dead exports in a library package.** With `entry: ["src/index.ts"]`, every re-export from a barrel counts as used by definition, so knip reports zero unused exports _by construction_. Its zero means "not measurable this way," not "clean" — pass 5's eight dead symbols all came from cross-referencing consumers instead. Every remaining `packages/@grantjs/*` unit has this shape. State the blind spot next to the number (rule 5) |
| Pass 5 | Pass 6 and every later one | **Check assignability before filing a "silent failure."** Pass 5's brief called a stale enum value "no type error, no runtime error, just fewer rows matched" and attached a conditional `security-full` bar to it. `tsc` already rejected it — the `Array<keyof XModel> = Object.values(XEnum)` idiom makes every value assignability-checked. This is pass 3's carried input, which pass 5's own stack plan quoted approvingly one slice before failing to apply it. Quoting a rule is not applying it |
| Pass 5 | Pass 6 and every later one | **Never pipe an existence check through `head`.** Pass 5 deleted `packages/@grantjs/schema/tsconfig.build.json` as dead config and broke the e2e stage: `scripts/docker/build-api-production.mjs:66` composes the path dynamically and throws if it is missing, for all 15 packages in the production API image. The search was run with the right patterns and `*.mjs` included — and truncated, with the one real hit below the cut. This is rule 1's corollary one level up: verifying the tool ran is not verifying you saw all of its output. Worse, the visible hits (two unrelated `vite.config.ts` references) formed a coherent story, and **a partial answer that explains itself is more dangerous than no answer** |
| Pass 5 | Pass 6 and every later one | **A child `exclude` in tsconfig replaces the inherited one; it does not merge.** Fixing the above by adding `src/test-support/**` to schema's `tsconfig.build.json` silently dropped the parent's `*.test.ts` patterns and started compiling the test suite into the production image — worse than the leak being fixed. Caught by listing `dist/` afterwards rather than trusting a green `tsc`. Restate inherited patterns in full, and check the artifact |
| Pass 5 | Pass 6 and every later one | **Write count assertions as pins, not floors.** Pass 5 wrote `expect(files.length).toBeGreaterThanOrEqual(116)`; two slices later it removed a document and the assertion passed silently. A floor absorbs exactly the drift the test exists to catch. Exact counts force the change to be deliberate — and they are how a Tier 3 number stays honest between passes |

| Pass 6 | Pass 7 and every later one | **Check that the runner runs the check.** Nine of pass 6's twelve packages had no `lint` script, so `turbo lint` skipped them entirely and three lenses scored "clean" because no tool had looked. Adding rules alone would have produced nine that are syntactically valid, permanently green, and never executed. This is pass 3's "prove the check fires" displaced one level up — verify with `turbo <task> --dry-run=json`, filtering on `command !== '<NONEXISTENT>'`, before trusting any per-package result |
| Pass 6 | Pass 7 and every later one | **A silently failed read looks exactly like data.** Three times in one pass: `node -e "require(…)"` threw on a JSON file containing comments and printed an empty string, read as "no `extends`"; a `for` loop over an unquoted variable ran **once** instead of twelve times under zsh, printing a clean-looking result for a check that never ran; and a mutation whose search string did not match reported the suite green. In each case the tool produced _something_, and the something was mistaken for a result. Assert that the read/edit/mutation actually applied, then read the value |
| Pass 6 | Pass 7 and every later one | **A package is not its `src/` directory.** Pass 6's dead-export classifier scanned `src/` only and reported `TAILWIND_SHADE_500_HEX` dead when `constants/scripts/check-palette-distance.ts` imports it — one edit from deleting a live symbol. Two more (`getLocalesPath`, `jobRegistry`) are referenced only from `docs/`. Scope the reference search to the whole unit plus `docs/`, and treat a docs-only reference as its own finding: `jobRegistry`'s documented import path does not exist |
| Pass 6 | Pass 7 and every later one | **Vitest does not reproduce the production module system.** Vite's transform supplies CJS interop, so `typeof require` is `'function'` in a test where it is `undefined` in the ESM output Node runs. Pass 6's Tier 0 (`require()` in a `"type": "module"` package) cannot be caught by any unit test — reverting the fix leaves the suite green, verified by mutation. For this class of defect the lint rule is the guard and the only runtime reproduction is executing `dist/`. Do not write a test that pretends otherwise; pass 6 deleted its vacuous one rather than count it |
| Pass 6 | Pass 7 | **The published trio is a contract audit, not a consistency pass.** `client`, `server` and `cli` are the only non-private packages (`scripts/check-publishable-packages.mjs`), `server` ships four example apps and `client` one. "Unused export" there may mean "used by a downstream consumer you cannot grep", so lens 4 and lens 5 need different rules than pass 6 used. Note pass 5 recorded `cli` as a possible dead unit on a 0-importer count; it has no _internal_ importers because it is a product |
| Pass 7 | Pass 8 and every later one | **Trace the consumer before grading the producer.** Pass 7 filed "`@grantjs/schema`'s build script emits nothing" as a Tier 0 defect without asking who consumed the output. Nobody did — production compiles through a different script with a different tsconfig, and 14 sibling packages have no `build` script at all. Finding that a step is inert is half a finding; the other half is who relied on it, and that half is where the tier comes from. Two of three Tier 0 items were regraded on this basis, and the challenge came from the human gate, not from the audit |
| Pass 7 | Pass 8 and every later one | **When the unit is a contract, read the artifact, not the source.** Every public-surface number in pass 7 is parsed from the built `.d.ts`. Grep got it wrong twice — matching JSDoc `@example` blocks as real exports, then missing `export async function` and bare `export { … }`, undercounting one package by 12. It is also the only method that can see `@grantjs/cli`'s public surface is **zero** despite 43 exported symbols in `src` |
| Pass 7 | Pass 8 and every later one | **A tool reporting success is not the tool having done the thing.** `gh stack sync` printed `✓ Pushed and synced 8 branches` while leaving four of them on a stale base, and an entire slice was written against a base missing its two predecessors — caught only because a test count came back 31 where the previous slice had just made it 61. This is pass 6's "check that the runner runs the check" applied to the tool doing the checking. `docs/contributing/agentic-sdlc.md` now prescribes `gh stack add` per slice, which removes the failure mode rather than documenting it |
| Pass 7 | Pass 8 and every later one | **Fixing the verdict is not the same as fixing the practice.** Pass 6 declared `gh stack` could not grow a stack incrementally, then corrected itself to "`init` adopts existing and creates missing" — true, and it left the wrong workflow in place for a whole further pass. The tool's own `--help` had shown `gh stack add` the entire time. When you correct a belief about a tool, check whether the practice built on it also needs to change |
| Pass 7 | Pass 8 and every later one | **A child tsconfig key REPLACES the inherited one — and this is now confirmed for two keys, not one.** Pass 5 recorded it for `exclude`. Pass 7 hit it for `paths`: deleting a dead mapping re-inherited the root's `@grantjs/*` glob and reproduced the very error class the deletion was meant to remove. The fix was an explicit `"paths": {}`. Assume it holds for every key, and verify by running the check rather than by reading the config |
| Pass 6 | Pass 8 | **`apps/config` has never been audited** — 31 files, 4,839 lines, a third Next.js app depending on `core`, `env` and `email`. It appeared in no pass table, no roster and no carried-input entry until pass 6 went looking. It wants the `apps/web` lenses, and it should not be folded into a package pass to make a table look finished |
| Pass 6 | Pass 7 and every later one | **Read `--help` before concluding a tool cannot do something.** Pass 6 wrote "`gh stack` cannot grow a stack one slice at a time" into a stack plan on the strength of two error messages; `gh stack init --help` states the opposite in one sentence. Two refusals formed a coherent story and the story was wrong — the same shape as pass 5's C3, where a truncated search result explained itself convincingly. `docs/contributing/agentic-sdlc.md` now carries the corrected workflow |

Widening a guardrail is the **first** slice of a pass, not the last. Running it early tells you the true size of the unit before you write a finding; running it late means auditing by hand what a rule would have counted exactly — rule 1, applied to the pass's own schedule.
