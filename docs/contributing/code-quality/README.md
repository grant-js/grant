# Code quality passes

A repeatable audit for one workspace unit at a time — `apps/api`, `apps/web`, `packages/@grantjs/core`, `packages/@grantjs/database`, `packages/@grantjs/schema`, and the adapter packages.

The goal is **consistency**, not perfection. `AGENTS.md` already defines the layering rules, and CI enforces the build. What these passes catch is everything the rules do not mechanically prevent: the same block copied into forty files, five implementations of pagination, exports nobody imports, and two names for one concept.

## Method

One unit per pass. Each pass produces a findings document in this directory named after the unit (`api.md`, `web.md`, …) and, when it surfaces actionable work, a story brief and stack plan under `plans/`.

Findings are **evidence-first**. Every claim cites `file:line`. A finding without a citation is an opinion and does not belong in the document.

Five rules learned the hard way on pass 1 (see [its corrections table](./api.md#corrections)):

1. **Run the tool before stating a count.** Grep finds instances; a type-aware lint rule finds the pattern. Pass 1 reported one un-awaited promise and there were thirteen, and ~115 dead exports where there were 361. If a rule exists for the finding, run it — and prefer reporting "the rule reports N" over "I found N".
2. **A rule violation is not automatically a defect.** Before filing, check for an intentional design: a sentinel protocol with a mapping layer, a constant mirroring a database constraint, an adapter port that only looks misfiled. Five of pass 1's findings were correct code and an incorrect reading.
3. **"Mechanical" is a claim to test, not assume.** Size the work by opening the hardest instance, not the easiest. One pass-1 item scoped as an import fix turned out to require moving type ownership between packages.
4. **Count findings by the edit they imply, not by the tool's issue type.** knip's "unused export" covers three edits with different risk: deleting a barrel line whose implementation is alive, dropping an `export` keyword from a symbol its own file still uses, and deleting a declaration. Only the last removes behaviour. Reported as one number, a slice looks far more dangerous than it is — and the safest, largest group (encapsulation) disappears into it.
5. **State the tool's blind spots next to its output.** knip reads module exports, so it sees neither class members nor string-resolved references. Both bit pass 1: 13 dead methods it never looked at, and a dependency (`pino-pretty`, named only as a pino transport target) that it called unused and that nothing but a runtime smoke test would have caught.

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

## Enforcement

A finding that can be checked by a script should become a check, or the next pass rediscovers it. Prefer, in order:

1. **A lint rule** — `no-restricted-imports` for the import table, `no-floating-promises` for un-awaited async, `eslint-plugin-boundaries` or `dependency-cruiser` for the layer DAG.
2. **A CI step** — `knip` or `ts-prune` for dead exports.
3. **A documented convention** — only when neither of the above can express it.

Locking in a lens that currently passes costs nothing and is the highest-value output of a pass. Do it while the result is green.

## Writing the findings document

Keep it scannable. Tables over prose for anything countable. Lead with what holds — a pass that opens with a list of failures misrepresents a codebase whose architecture is sound and whose problem is repetition.

State counts precisely (`7 violations`, not `several`). Where a rule is violated in one file but followed in another file for the same concern, cite both — internal inconsistency is stronger evidence than an absolute count.

## Completed passes

| Unit       | Pass | Document           |
| ---------- | ---- | ------------------ |
| `apps/api` | 1    | [api.md](./api.md) |
