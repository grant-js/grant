# Code quality: the published trio (`client`, `server`, `cli`)

Pass 7. Audited 2026-08-19 against `main` @ `76e765d4`. Merged 2026-08-21 as [#302](https://github.com/grant-js/grant/pull/302) (`634efce3`).

- **Brief**: [`plans/2026-08-19-published-packages-code-quality-brief.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-19-published-packages-code-quality-brief.md)
- **Stack plan**: [`plans/2026-08-19-published-packages-code-quality-stack.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-19-published-packages-code-quality-stack.md) — including its [corrections log](https://github.com/grant-js/grant/blob/main/plans/2026-08-19-published-packages-code-quality-stack.md#corrections)

## Summary

The first pass whose unit is a **contract** rather than a codebase. `client`, `server` and `cli` are the only non-private packages, so "unused export" stops meaning "deletable" and every finding has to be graded against what npm consumers can see.

Two things made that concrete. **`@grantjs/cli` has no module API at all** — its `exports` map declares only `"."`, whose built `dist/index.d.ts` is `#!/usr/bin/env node` + `export {};` — so lens 5 had to be pointed at its command surface instead. And **what is semver-public is what the built `.d.ts` re-exports, not what `src` declares**: measured from the artifact, `client`'s contract is _wider_ than its own source (it re-exports two schema types) while `server`'s is narrower (6 of 37 never reach an entry point).

Underneath that sat a Tier 0 that had survived six passes: **the two SDKs type-checked to a different answer depending on filesystem state.**

|                                       | Before                   | After                           |
| ------------------------------------- | ------------------------ | ------------------------------- |
| Packages in scope                     | 3 + 5 example workspaces | same                            |
| Hand-written `src`                    | 4,063                    | 4,017                           |
| `turbo lint` actually runs            | 23 of 27                 | **26 of 27**                    |
| `turbo type-check` actually runs      | 21 of 27                 | **26 of 27**                    |
| ESLint config blocks                  | 36                       | **39**                          |
| `dead-code:*` gates                   | 6                        | **7** (every workspace covered) |
| Tests                                 | 152                      | **227**                         |
| Definitions of `AuthorizationResult`  | **5**                    | **1** (the SDL) + 1 derived     |
| Workspaces unclassified in changesets | 2                        | 0                               |
| `release:check` runs in CI            | **no**                   | yes                             |

## What holds {#what-holds}

Verified by **building the packages and inspecting `dist/`**, not by reading config:

| Check                       | Result                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Lens 1 — DAG                | **Clean.** `client`→`schema`, `server`→`schema`, `cli`→nothing. Now enforced by three rules |
| `exports` map integrity     | **Clean.** All 24 declared condition targets resolve to a real built file                   |
| `bin` integrity             | **Clean.** `cli`'s shebang survives bundling; `bin.grant` resolves                          |
| No test artefacts in `dist` | **Clean** in all three                                                                      |
| Logging discipline          | **Clean** — and `cli`'s 81 `console.*` calls are **not** a violation                        |

**`cli`'s `console.*` calls were the pass's first rule-2 catch.** `AGENTS.md:106` scopes the no-console rule to "API source or runtime adapter code." A CLI's stdout _is_ its user interface. Filing 81 findings there would have been a fabricated Tier 1.

## Tier 0 — the SDKs type-checked non-deterministically {#tier-0}

### `client` and `server` mapped `@grantjs/schema` to a file that can never exist — **fixed** (slice 1)

Both tsconfigs carried `"paths": { "@grantjs/schema": ["../schema/dist/index.d.ts"] }`. The shared build parent sets **`declaration: false`**, so no build path in the repo — production's included — emits that file. The mapping had **never resolved once**.

Type-check passed only by falling back to node resolution. With a stale `schema/dist/` present it failed with **10 × TS6059**. Which you got depended on what was last run in the working tree, and turbo's cache hid it further: the cached run was green and `--force` was red on the same tree.

**The fix is `"paths": {}`, not deleting the key** — and that distinction is the finding. A child `paths` **replaces** the inherited one, so removing it re-inherits the root's `@grantjs/*` → `./packages/@grantjs/*` mapping, resolves schema to `.ts` source outside the package's `rootDir`, and reproduces the same error class. **This is pass 5's C4 (`exclude` does not merge) recurring for a second key**, which pass 5 never mentioned.

Proven by planting the failure rather than by a clean run — a clean tree passed _before_ the fix too:

| State                              | Result             |
| ---------------------------------- | ------------------ |
| Old mapping + stale `schema/dist/` | **red, 10 errors** |
| `"paths": {}` + stale dist         | green              |
| `"paths": {}`, no dist             | green              |

### Two things this looked like and wasn't

**`@grantjs/schema`'s `build` script emits nothing — by design.** It resolves to root's `noEmit: true`. Nothing consumes the output: production compiles through `build-api-production.mjs` with `tsconfig.build.json`, and 14 sibling packages have no `build` script at all. An earlier draft filed this as a Tier 0 chain. **The correction came from the gate**, and the transferable rule is: _a script that does nothing is only a defect if something depends on its output — trace the consumer before grading the producer._

**`codegen:check` is not a footgun.** It was called one on the strength of a corrupted working tree. `graphql-codegen` is deterministic — two consecutive runs are byte-identical and identical to what is committed, verified with `md5sum`. The real event was a **partial write** from a SIGTERM'd pre-push hook, recoverable with `git checkout`.

## Tier 1 — guardrails that existed and never ran {#tier-1}

### The DAG rules — **resolved** (slice 2)

`PUBLISHED_PACKAGE_DEPS`, deliberately a separate map from `INTERNAL_PACKAGE_DEPS`, because the distinction is a review bar rather than a rule shape: an accidental workspace import here ships a **private, unpublished package into a consumer's dependency graph**.

| Allowed to import | Package            |
| ----------------- | ------------------ |
| `schema`          | `client`, `server` |
| nothing           | `cli`              |

**The generated glob had to widen from `src/**/*.ts` to `src/**/*.{ts,tsx}`.** Without it the rule was silently inert across all of `client/src/react/**` — syntactically valid, permanently green, never firing on the files most likely to reach for something new. That is pass 6's "check that the runner runs the check", one level down: the _rule_ existed and the _files_ were out of its reach.

All three proven in both directions — a planted `@grantjs/database` import errors in all three, and `@grantjs/schema` is **accepted** in `client`/`server` while **rejected** in `cli`, which is what separates a real allowlist from a blanket ban that happens to be green.

### The example workspaces were outside every gate — **resolved** (slice 3)

The five examples are the primary documentation for these packages — what a consumer copies first.

| Workspace               | Lines | `lint` before | `type-check` before |
| ----------------------- | ----- | ------------- | ------------------- |
| `example-express`       | 128   | ✗             | ✗                   |
| `example-fastify`       | 147   | ✗             | ✗                   |
| `example-nestjs`        | 172   | ✗             | ✗                   |
| `example-nextjs`        | 788   | ✓             | ✗                   |
| `example-nextjs-client` | 1,122 | ✓             | ✗                   |

`example-nextjs-client` is **built as a Docker image by `release.yml`** — a released artefact that had never been type-checked. All five type-check clean on the first run; the brief budgeted for pre-existing errors and there were none. Enabling lint surfaced 4 import-sort errors, all autofixed.

### Two release-config gaps — **resolved** (slice 3)

- **`release:check` ran in no workflow.** The script that enforces _exactly which packages may be published_ was a manual step nobody was required to take.
- **`@grantjs/env` and `@grantjs/webhooks` were in neither `fixed` nor `ignore`** in `.changeset/config.json`, while all 12 siblings were in `ignore`. Both are `private`, so neither could publish — but both would have drifted out of the version lockstep the `fixed` group exists to hold.

## Tier 2 — five definitions of one type {#tier-2}

### The SDKs now use the SDL — **resolved** (slice 5)

`AuthorizationResult` had **five** definitions: the GraphQL SDL, an orphan in `core`, byte-identical hand-written copies in `client` and `server`, and an under-specified zod validator in `apps/api`.

**There was never a REST contract and a GraphQL contract.** Both SDKs call exactly one endpoint — `POST /api/auth/is-authorized` — and that route returns the handler's value directly, typed from `@grantjs/schema` the whole way down. An earlier draft read the validator's `z.unknown()` as evidence of a second contract and proposed a hand-written shared module in `schema`; that was wrong, and it would have worked **against** `AGENTS.md` § API surface, which requires exactly the reuse that was eventually done.

**`AuthorizationResult` is derived rather than re-exported, and that is a finding the duplication was hiding.** The SDKs report their own transport failures through the same field the server uses for the enum — on a network error they return `{ authorized: false, reason: 'Unknown error' }`. So the SDK type is genuinely **wider** than the wire type:

```ts
Omit<SchemaAuthorizationResult, 'reason'> & {
  reason?: AuthorizationReason | (string & {}) | null;
};
```

`tsc` surfaced this the moment the swap landed — the compiler doing the review, as pass 3's carried input predicts. `(string & {})` keeps the union assignable both ways, so consumers treating `reason` as `string` still compile.

**Public surface verified byte-identical** from the built `.d.ts`: `client` 21 symbols, `server` 33. No major version; the platform stayed in lockstep on 1.5.x.

## Tier 3 — divergent styles {#tier-3}

### 3.1 The published packages cannot use `@grantjs/core`'s errors — **exemption recorded**

`server/src/errors.ts` declares a five-class hierarchy shadowing four of `core`'s names; `client` throws 3 raw `Error`s and `cli` 18. **None of this can comply.** Importing `core` into a published package would add a private, unpublished workspace package to the npm dependency graph of the SDKs. This is the rubric's **unfollowable rule** case — recorded against the rule, exactly as `env`'s raw `Error` was in pass 6.

### 3.2 The `tsconfig.build.json` dialects — **resolved for the trio** (slice 9)

Pass 6 left "12 extend the shared parent, 6 extend their own" open. **The trio does not converge**, and the reason is measured: pointing `client` at `../tsconfig.build.json` fails with `TS2304: Cannot find name 'RequestCredentials'`. The shared parent is shaped for the production API image (`lib: ["ES2022"]`, `types: ["node"]`, `declaration: false`); the trio needs DOM types and **emits declarations**, which is the entire reason `vite-plugin-dts` reads that file.

Recorded in `client/tsconfig.build.json` itself, where the next person to tidy it will see it before trying.

### 3.3 Two mechanisms for keeping tests out of `dist` — **converged** (slice 9)

`cli`'s `dts` plugin had no `exclude` where its siblings both set one. Redundant today, but it left the guarantee resting on which tsconfig the plugin happens to read.

## Tier 4 — dead surface {#tier-4}

**24 findings, and counted by the edit each implies (rule 4) it is barely a deletion finding:**

| Edit                                            | Count | Risk                               |
| ----------------------------------------------- | ----- | ---------------------------------- |
| Used only in its declaring file → drop `export` | 6     | None — the export was the accident |
| Re-export nothing imports → drop the line       | 11    | None                               |
| Superseded → wired in rather than deleted       | 1     | None                               |
| Genuinely dead → delete                         | 1     | Examined individually              |
| Intentional, not measurable → configure         | 1     | —                                  |

**`isDebugGrant` was not deleted.** It was a second implementation of a live check that `debugGrant` had inlined. Wiring it in removed the duplicated predicate and gave the export a caller — rule 7's _an unused guard is a candidate call site, not automatically a deletion_.

**`knip` measures something narrower here than the name suggests**, and the gate's CI comment says so: entry points are inferred from each package's `exports` map, so a symbol re-exported from a public barrel counts as used **by construction**, and a genuinely unused one is still not deletable without a major. What it catches is unused _files_, unused _dependencies_, and exports that never reach a public entry point.

The gate was proven to fire: exit 0 clean, exit 1 with a planted dead export, exit 0 restored.

## Tier 6 — coverage {#tier-6}

152 tests before, **227** after, all mutation-checked.

**`token-extractor.ts` was this pass's SSRF guard** — the function deciding which credential authenticates a request, reached by all four framework adapters, **semver-public**, and untested. 30 characterization tests.

**No authentication bypass found.** Every surprising behaviour fails closed. Four are pinned as `CHARACTERIZATION` and want a decision rather than a silent edit — see [Open items](#open).

The remaining surface was covered by lines at risk: `cli/commands/config-cmd.ts` (304L), `server/errors.ts` (66L), and the two Nest files. `config-cmd.ts` is driven **through Commander** rather than by reaching for its module-private helpers, because `cli` has no module API — its contract is the command surface, so that is the level the tests work at.

`errors.ts` pins `instanceof` across all five classes: each constructor calls `Object.setPrototypeOf` to work around the ES5-target subclassing break, and if a build-config change drops those, `instanceof` silently returns false and every consumer `catch` stops matching. Confirmed by mutation — removing one `setPrototypeOf` turns two tests red.

**One assertion was vacuous and was replaced.** It compared `Function.length` across the error subclasses; `length` is 0 for all four, because it counts only parameters before the first defaulted one. It failed rather than passing silently, but it is the same class pass 4 recorded.

## Open items {#open}

| Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Where                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Duplicate cookie name: the LAST value wins**, decided implicitly by assignment order in `parseCookieHeader`'s `forEach`. Cookie shadowing from a subdomain is a real attack class; this is **session-fixation shaped, not privilege escalation**. Wants a deliberate decision                                                                                                                                                                                                                                                                                                         | `server/utils/token-extractor.ts`               |
| **Cookie values are not URL-decoded**, so a percent-encoded token arrives mangled. Fails closed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | same                                            |
| **The Web-API branch never consults `req.cookies`** while the Express branch does, so a request carrying both resolves differently by branch                                                                                                                                                                                                                                                                                                                                                                                                                                            | same                                            |
| **`apps/api` validates `matchedPermission` as `z.unknown()`**, so the published OpenAPI describes it as untyped while GraphQL describes it fully — same payload, two qualities of documentation. **Deferred at gate 1 to a follow-up story**                                                                                                                                                                                                                                                                                                                                            | `rest/schemas/authorization.schemas.ts:18`      |
| **`client` declares a `@tanstack/react-query` peerDependency that nothing in `src` references.** The unused devDependency was removed; the peer is a contract question                                                                                                                                                                                                                                                                                                                                                                                                                  | `client/package.json`                           |
| **The built `dist/*.d.ts` import `../../schema/src/index.ts`** — a relative path with a `.ts` extension pointing outside the package. Pre-existing, and it resolves in both npm-flat and pnpm layouts, but it makes "schema ships `src/`" load-bearing                                                                                                                                                                                                                                                                                                                                  | all three                                       |
| **`release.yml`'s build artifact globs `packages/*/dist`**, which cannot match `packages/@grantjs/*/dist`. Harmless today because each package rebuilds via its own `prepublishOnly`                                                                                                                                                                                                                                                                                                                                                                                                    | `.github/workflows/release.yml:163`             |
| **`Grant('Document')` with no action** passes the bare string to `SetMetadata`, so `GrantGuard` reads `.resource` as `undefined`. Fails closed, but late                                                                                                                                                                                                                                                                                                                                                                                                                                | `server/nest/grant.decorator.ts`                |
| **`GrantModule.forRoot` builds a client per call** rather than memoising                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `server/nest/grant.module.ts`                   |
| **`core`, `database` and `env` hand-restate what the shared build parent provides** — unlike the trio, with no DOM or declaration requirement to justify it                                                                                                                                                                                                                                                                                                                                                                                                                             | internal packages                               |
| **`connection.test.ts`'s first test sits ~1% under vitest's 5s default and flakes in CI.** It timed out at **5,064 ms** on the gate-4 run and passed on re-run of identical code; locally it takes **335 ms**. Pass 4 already mitigated this — the 110-table schema barrel _is_ mocked, with a comment naming this exact failure — so what remains is the cold-import cost of the first `vi.resetModules()` import. **Do not fix it by raising `testTimeout`**: pass 4's carried input says that hides the cost instead of removing it. `@grantjs/database`'s territory, not the trio's | `database/src/connection/connection.test.ts:52` |
| **The pre-push hook duplicates CI**: 12 of its 13 steps are also CI gates, and it fires **once per branch pushed**. Recommendation on record — keep `secret-scan:protect`, drop the rest, add `pnpm verify`                                                                                                                                                                                                                                                                                                                                                                             | `.husky/pre-push`                               |

## What this pass's method surfaced {#method}

Eight claims in this pass's own planning documents were disproved by implementing them; all are in the [corrections log](https://github.com/grant-js/grant/blob/main/plans/2026-08-19-published-packages-code-quality-stack.md#corrections). The transferable ones:

**Trace the consumer before grading the producer.** Finding that a build step is inert is half a finding — the other half is who was relying on it, and that half is where the tier comes from. Two of three Tier 0 items were regraded on that basis.

**Read the artifact, not the source, when the unit is a contract.** Every public-surface number in this pass is parsed from the built `.d.ts`. Grep got it wrong twice — first by matching JSDoc `@example` blocks as exports, then by missing `export async function` and bare `export { … }`. It is also the only method that can see that `cli`'s public surface is zero.

**A tool reporting success is not the tool having done the thing.** `gh stack sync` printed `✓ Pushed and synced 8 branches` while leaving four of them on a stale base; an entire slice was written against a base missing its two predecessors, caught only because a test count came back 31 where it should have been 61.

**Fixing the verdict is not the same as fixing the practice.** Pass 6 declared `gh stack` could not grow a stack incrementally, then corrected itself to "`init` adopts existing and creates missing" — true, and it left the wrong workflow in place for another whole pass. The tool's own `--help` showed `gh stack add` the entire time.

**Formatters run last.** `lint-staged` was ordered `prettier --write` then `eslint --fix`, so import-sort's output was never re-formatted and a push failed `format:check` on a file the author never touched.

**Any dependency-block edit must go through the package manager.** Rewriting `package.json` directly left `pnpm-lock.yaml` stale; CI installs with `--frozen-lockfile` and died before a single check ran. Nothing local caught it, because `node_modules` was already correct.
