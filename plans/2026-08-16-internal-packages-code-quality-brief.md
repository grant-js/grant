# Story brief — internal `@grantjs/*` packages code quality remediation

## Metadata

- **Slug**: `internal-packages-code-quality`
- **Date**: 2026-08-16
- **Author**: PM agent, from an assessment run against `main` @ `178dd710`
- **Status**: **approved** — gate 1 cleared 2026-08-16, Ale Heredia. Stack planning may proceed.
- **Pass**: 6 of the [code quality passes](../docs/contributing/code-quality/README.md)
- **Findings document** (written by the last slice): `docs/contributing/code-quality/internal-packages.md`

## Objective

Audit and remediate the **13 internal `@grantjs/*` packages** that no pass has reached — the nine core-port adapters plus `constants`, `env`, `i18n`, and `platform` — and, in doing so, take the repo's code-quality guardrails from "five units" to "every internal unit," which is the durable output.

## Scope correction — this is not the pass the table describes {#scope-correction}

`docs/contributing/code-quality/README.md:168` scopes pass 6 as "Remaining packages," and pass 5's carried input already flagged that the roster is 19 packages rather than the 11 in `AGENTS.md`. Re-measuring against `main` shows pass 5's correction was itself incomplete in two ways that change the scope.

**The remainder is three different audits, not one.**

| Class                      | Packages                                                                              | Hand-written `src` | Tests |
| -------------------------- | ------------------------------------------------------------------------------------- | ------------------ | ----- |
| **A — core-port adapters** | `cache` `storage` `email` `jobs` `logger` `errors` `telemetry` `analytics` `webhooks` | 3,362              | **0** |
| **B — internal leaves**    | `constants` `env` `i18n` `platform`                                                   | 2,978              | **0** |
| C — published npm          | `client` `server` `cli`                                                               | 5,765              | 10    |

**This story is A + B: 13 packages, 6,340 lines, zero tests.**

**Class C is deferred to pass 7, and the reason is not size.** `scripts/check-publishable-packages.mjs:15-20` names `schema`, `client`, `server`, and `cli` as the intended publishable set. Every export in those three is semver-public, `server` ships four example apps (`examples/{express,fastify,nestjs,nextjs}`), and `client` ships one. Lens 4 and lens 5 mean something different when "unused export" may mean "used by a downstream consumer we cannot grep." That is a contract audit with its own review bar, not a consistency pass.

**Two corrections to pass 5's carried input, both load-bearing:**

1. **`cli` is not a dead unit.** Pass 5 recorded it as "0 importers … may be dead." It has zero _internal_ importers because it is a published CLI — a product, not a library. Same for `server` (4 internal importers, all in its own examples).
2. **`platform` is the only genuinely dead unit** — 28 lines, 0 importers, `private: true`, no `tsconfig.build.json`, and absent from `WORKSPACE_PACKAGES` in `scripts/docker/build-api-production.mjs:16-32`. **Decided at gate 1: deleted whole, nothing relocated** — see [`platform`](#platform). So this story ends with 12 internal packages, not 13.

**And a fourth unaudited unit nobody has counted: `apps/config`** — 31 files, 4,839 lines, a third Next.js app. It appears in no pass, in no pass-table row, and in no carried-input entry. Out of scope here; recorded so it stops being invisible.

## What the assessment found

### What holds — lock these in, this is the highest-value output {#what-holds}

Three lenses are clean across all 13 packages _today_. The rubric's rule is to lock a lens in while the result is green.

| Lens                  | Result                                                                                                          | Evidence                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Layer integrity   | **Clean.** Every `@grantjs/*` import in all 13 respects the DAG                                                 | Only `core` (10 packages), `schema` (`jobs` only, 2 imports). `env`, `i18n`, `platform` import nothing. No adapter imports another adapter                                                               |
| 2 — Import discipline | **Clean.** No package imports `@grantjs/logger`; all take `ILoggerFactory` by injection as `AGENTS.md` requires | The three apparent hits in `telemetry/src/factory.ts:32`, `analytics/src/factory.ts:31`, `webhooks/src/factory.ts:35` are **prose in doc comments saying they must not** — rule 2, checked before filing |
| Logging discipline    | **Clean.** Zero `console.*` calls in runtime source across all 13                                               | —                                                                                                                                                                                                        |

**Guardrail coverage is the gap.** `eslint.config.mjs` has per-package DAG blocks at `:378` (`core`), `:401` (`database`), `:415` (`schema`) — and nothing for these 13. `dead-code:*` covers `api`, `web`, `core`, `database`, `schema` (`package.json:21-25`) — and nothing for these 13. So a clean lens 1 is currently clean by luck and review, not by rule.

### Tier 3 — divergent styles

**3.1 Error vocabulary: 14 raw `throw new Error` against 43 domain-error throws.** `AGENTS.md` § Error handling says always use domain-specific errors. The split is not uniform, which is the stronger evidence:

| Package     | Raw `Error` | Domain errors | Reading                                                      |
| ----------- | ----------- | ------------- | ------------------------------------------------------------ |
| `email`     | 0           | 25            | Compliant                                                    |
| `storage`   | 0           | 11            | Compliant                                                    |
| `jobs`      | **10**      | 3             | Mixed _inside one package_ — the strongest signal in the set |
| `constants` | **3**       | 0             | Non-compliant, and it does import `core`                     |
| `env`       | **1**       | 0             | **Cannot comply** — see below                                |

`jobs`' ten map cleanly onto core's hierarchy: four are `Job ${jobId} not found` (`bullmq/index.ts:178,193`, `node-cron/index.ts:94,109`) → `NotFoundError`; three are `already registered`/`already scheduled` (`registry.ts:41`, `bullmq/index.ts:69`, `node-cron/index.ts:28`) → `ConflictError`; three are scope-validation throws in `types.ts:33,37,40` → `ValidationError`. `constants`' three are all `NotFoundError`-shaped.

**`env` is the lens-2 "unfollowable rule" case, and it is a decision, not a fix.** `env/src/load-env.ts:24` throws a raw `Error` because `@grantjs/env` declares **no `@grantjs/*` dependency at all**. Complying means adding `@grantjs/core` as a dependency of the one package deliberately kept dependency-free. That is a Tier 0 finding against the rule, per the rubric — record the exemption or accept the dependency, but do not quietly "fix" it.

**3.2 Factory style: 6 static-class factories against 1 function.** `cache`, `storage`, `email`, `jobs`, `telemetry`, `analytics` each export `class XFactory` with static methods; `webhooks/src/factory.ts:38` exports `function createWebhookAdapters`. Note `AGENTS.md` describes adapters as receiving config "via constructor/factory params" without picking one. Decide and document; 6-vs-1 makes the cheaper direction obvious.

**3.3 Two `tsconfig.build.json` dialects — carried in from pass 5, and larger than its backlog entry said.** Of the **18** packages carrying one, **12 extend the shared `packages/@grantjs/tsconfig.build.json`** and **6 extend their own `./tsconfig.json`** (`client`, `cli`, `core`, `database`, `env`, `server`). See [C4](./2026-08-16-schema-code-quality-stack.md#c4--the-test-support-leak-fix-does-not-live-in-the-shared-parent-close-out), and [C1](./2026-08-16-internal-packages-code-quality-stack.md#corrections) for why the first count of this was wrong.

### Tier 2 — repetition

**An 11-line `noopLogger: ILogger` block, byte-identical including its comment, in 6 declaration sites across 5 packages**: `cache/src/factory.ts:7-17`, `storage/src/factory.ts:16-26`, `email/src/factory.ts`, `webhooks/src/factory.ts`, `jobs/src/factory.ts`, `jobs/src/base/job.ts`.

Sized per rule 6 — the saving is the 11-line declaration at each site, and the call site is unchanged either way (`loggerFactory?.createLogger(…) ?? noopLogger` before and after, with `noopLogger` imported instead of declared). So: **~66 lines removed, 6 call sites untouched, one new export.**

`@grantjs/core` exports no such default today (checked). It is the right home: it owns `ILogger`, and all five packages already depend on it, so this adds no edge to the DAG. This is the one extraction in the pass that survives being opened.

### Tier 4 — dead surface, and what the number actually means

**89 exported symbols across the 13 have no reference outside their own package.** Per-package: `constants` 23, `email` 11, `errors` 8, `jobs` 7, `platform` 7, `storage` 6, `telemetry` 5, `analytics` 5, `webhooks` 5, `logger` 4, `cache` 3, `env` 3, `i18n` 2.

**That 89 is not a deletion list, and most of it is not even a risk.** Counted by the edit each implies (rule 4):

| Edit class                            | Roughly                                                                                                                                                                                 | Risk                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Drop the `export` keyword**         | Adapter impls + their configs, constructed only by their own factory — `RedisCacheAdapter`, `S3StorageAdapter`, `SmtpEmailAdapter`, `BullMQJobAdapter`, `CloudWatchTelemetryAdapter`, … | **None.** This is the port pattern working; the export is the accident |
| **Delete the declaration**            | `platform`'s entire 7-symbol surface — the package goes with it                                                                                                                         | Decided; see [`platform`](#platform)                                   |
| **Ambiguous — resolve before acting** | `errors`' 8 `Http*` subclasses; `constants`' account-tier role vocabulary                                                                                                               | See below — rule 7                                                     |

**`knip` cannot measure any of this**, and the reason is pass 5's carried input applying unchanged: `knip.json` sets `entry: ["src/index.ts"]` for `packages/@grantjs/*`, so every re-export from a barrel is "used" by construction. All 89 came from cross-referencing consumers. State the blind spot next to the number.

**Two rule-7 ambiguities to resolve, not delete:**

1. **`@grantjs/errors` exports 8 `Http*` subclasses that nothing outside the package references** — `HttpBadRequestError`, `HttpValidationError`, `HttpUnauthorizedError`, `HttpForbiddenError`, `HttpNotFoundError`, `HttpConflictError`, `HttpInternalError` (`http-exception.ts:43-94`), plus `HttpExceptionOptions`. `apps/api/src/lib/errors/index.ts` re-exports the package wholesale, and the API reaches for `mapDomainToHttp()` in 3 files while using the 7 subclasses in **exactly 0**. Superseded vocabulary, or the vocabulary the HTTP layer _should_ be using and isn't? That is exactly rule 7's validator ambiguity one type-level up, and it decides whether the edit is "delete 8 classes" or "the API layer has a gap."
2. **`constants` declares an account-tier role vocabulary that nothing consumes, while the organization-tier equivalent is live.** `ACCOUNT_ROLES` (`permissions/roles.ts:20`) and `ACCOUNT_ROLE_DEFINITIONS` (`:22`) have zero external references; `ORGANIZATION_ROLE_DEFINITIONS` (`:40`) has two. `ORGANIZATION_ROLES` (`:33`) also has zero. An asymmetry inside one file, in the package that defines the permission model, is more likely an unbuilt tier than clutter — and if so it is a finding about the product, not the code.

### `platform` — **decided: delete outright, relocate nothing** {#platform}

Decided 2026-08-16 by Ale Heredia. 28 lines, 2 files, 7 exports, **0 importers**, `private: true`, no `tsconfig.build.json`, absent from `WORKSPACE_PACKAGES` in `scripts/docker/build-api-production.mjs:16-32`. Its header calls it the "gateway contract … used by frontends and API for path-based routing."

The question raised at gate 1 was whether to relocate its literals into `@grantjs/constants` (or fold `constants` into it) rather than lose them. **Neither. The package is deleted whole**, for three measured reasons:

| Symbol                                    | Corresponding hard-coded sites | Reading                                                                                                                                                                                                         |
| ----------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OAUTH_PREFIX`, `EXAMPLE_PREFIX`          | **0** each                     | Speculative API for a gateway never built                                                                                                                                                                       |
| `WELL_KNOWN_PREFIX`                       | 7, none composed from a prefix | Every site uses the full literal `/.well-known/jwks.json` (`rest/routes/jwks.routes.ts:38`, `rest/openapi/jwks.openapi.ts:27`, + e2e). Adopting the constant removes no literal without also adding `JWKS_PATH` |
| `DOCS_PREFIX`                             | 2, both in one file            | `apps/web/lib/constants.ts:16,18`, both branching on dev vs prod against a hard-coded `localhost:5173`                                                                                                          |
| `API_PREFIX`, `GRAPHQL_PATH`, `apiPath()` | 6                              | The only two with real duplication                                                                                                                                                                              |

1. **It models the wrong contract.** The real `apps/api` ↔ `apps/web` routing coupling is `next.config.ts`'s rewrite table — **17 `source:` entries**, including `/api-docs`, `/api-docs.json`, `/swagger-ui.css`, `/swagger-ui-bundle.js`. `platform` declares 6 prefixes and does not cover `/api-docs` at all. This is not an unadopted contract; it is a contract that does not describe the system.
2. **`constants` is the wrong shelf.** Its five modules are domain vocabulary — permissions (2,093 of 2,421 lines), roles, colors, `MILLISECONDS_PER_MINUTE`, auth storage keys. HTTP route prefixes are a transport concern, and filing them there would be Tier 5 drift authored by the pass that exists to find it. There is a real cost too: `constants/src/permissions/permissions.ts:1` imports `ComparisonOperator` from `@grantjs/core` as a **value**, so any consumer reaching for `/graphql` inherits the core→schema chain.
3. **Web already has a home.** `apps/web/lib/constants.ts` exports `getGraphqlPlaygroundUrl()` (`:28`), `getDocsUrl()`, and `getApiDocsUrl()` for exactly these.

**Reverse direction rejected without further analysis**: folding `constants` (203 importers, 2,421 lines) into `platform` (0 importers, 28 lines) is a rename touching every importer to inherit an unused name.

**One real finding survives the deletion, and it is not solved by a constants package.** `apps/api/src/server.ts:118,125` mounts `/api` and `/graphql`; `apps/web/next.config.ts:20-22` proxies to them. They must agree and **nothing enforces it**. Record it in the findings document with a suggested fix of an assertion that the rewrite table matches the registered mounts. Explicitly **not** a slice of this pass.

### Lens 7 — coverage

**Zero tests across all 13 packages, 6,340 lines.** Unlike pass 5 — where the honest reading was that the unit-testable surface was near zero — this surface is genuinely testable: provider-selection factories, adapter behaviour, and pure functions.

**Two files carry security weight and have no tests at all**: `webhooks/src/ssrf.ts` (the SSRF guard) and `webhooks/src/signer.ts` (webhook signature generation). Run lens 7 as a **detector** here, per the rubric — pass 1's untested base classes produced three Tier 0 findings, and an untested SSRF guard is the highest-value place in this pass to look for a fourth.

## Acceptance criteria

- [ ] **Guardrails reach all 13 packages and are proven to fire.** ESLint DAG rules deriving each package's allowed set from **its own `package.json` `dependencies`** (pass 4's carried input: copying one package's rule broke the build), and `dead-code` coverage. Each new rule proven by planting a real violation and confirming it errors — never by a green run on a clean tree.
- [ ] **`AGENTS.md`'s package dependency graph is corrected** to the real 19-package roster, with the three classes distinguished and the published set named. Landed in the guardrail slice, since deriving the rules _is_ deriving the graph.
- [ ] **`docs/contributing/code-quality/README.md`'s pass table is corrected**: pass 6 = these 13, pass 7 = the published trio, and `apps/config` recorded as unaudited.
- [ ] **The `noopLogger` duplication is collapsed** to one export from `@grantjs/core`, with all 6 sites importing it.
- [ ] **The `database` test-support leak is closed** and verified by listing `dist/` after a production build, not by a green `tsc` (pass 5's C3: the first attempt at this class of fix made the leak worse and a green compile hid it).
- [ ] **Tests exist for `webhooks/ssrf.ts` and `webhooks/signer.ts`**, and for the provider-selection branch of each factory. **Every test mutation-checked** before being counted (pass 4's carried input) — mutate the code, confirm red.
- [ ] **Error-vocabulary decision applied**: `jobs` and `constants` converted to domain errors; `env`'s exemption recorded with its reason.
- [ ] **Dead surface actioned by edit class**, not by the aggregate 89 — encapsulation edits separated from deletions in the diff so the risky group is reviewable on its own.
- [ ] **`platform` deleted whole** — package directory, `pnpm-workspace.yaml` membership, and lockfile entry. No symbol relocated to `constants` or anywhere else; see [the decision](#platform). Verify nothing referenced it by running the full build and `pnpm --filter grant-web exec tsc --noEmit` after removal, not by trusting the 0-importer count.
- [ ] **Findings document written** with `file:line` citations throughout, including the `knip` blind spot stated next to its zero.
- [ ] **Carried inputs written into the README table** for pass 7.

## Non-goals

- **`client`, `server`, `cli`** — pass 7. Not touched here, including their `tsconfig.build.json` dialect.
- **`apps/config`** — recorded as unaudited; not audited here.
- **D0, D1, D4 from pass 5** — the SDL split, the 62 operation renames, and `apps/api`'s third copy of the status literals. All remain on `schema.md`'s backlog as their own stories. This pass does not widen to absorb them.
- **Relocating `platform`'s literals into `@grantjs/constants`, or anywhere else** — rejected at gate 1 with reasons recorded, so the deletion is not revisited mid-stack.
- **Enforcing that `next.config.ts`'s rewrite table matches `apps/api`'s registered mounts** — a real gap surfaced by the `platform` analysis, recorded in the findings document as a suggested assertion. Its own story.
- **Renaming anything that reached a public contract** — Tier 5 stays a glossary entry.

## Risk flags

- [x] **Security-sensitive code under test for the first time** — `webhooks/src/ssrf.ts` and `signer.ts`. Writing characterization tests for an SSRF guard can surface a real bypass; if it does, that is a Tier 0 finding and the slice escalates to `security-full`. **Characterize first** — assert what the code does today, including what looks wrong, then decide separately whether each is a defect.
- [x] **Production image contents change** — the `tsconfig.build.json` work alters what ships. Verify by listing `dist/`.
- [ ] Auth / tenancy / permissions — `constants` defines the permission model, but this pass touches only its unused exports and its error vocabulary, not the model.

## Suggested active roles

- **Project Manager** — gates, findings document
- **Principal Engineer** — slice order, integration
- **Architect** — the `AGENTS.md` graph correction and `platform`'s disposition
- **Senior Backend** — guardrails, error vocabulary, dead surface, `noopLogger`, build config
- **Senior QA** — the load-bearing role, as in pass 5: lens 7 is a detector here and the surface is genuinely testable
- **Senior Security** — blocking on the `webhooks` slice, independent of its author
- **Verifier** — after every slice, plus `tsc --noEmit` on `grant-api` and `grant-web`

Frontend is **not** active: none of the 13 is consumed by `apps/web` except `constants` and `i18n`, and neither is being changed in a way that reaches the UI.

## Note on how this brief was produced

Every count above was measured against `main` @ `178dd710` and re-run when the first result was suspect. Three checks were wrong on the first attempt and are worth recording, because two of them are the rubric's own rules biting the pass that wrote them:

1. **A `for` loop over an unquoted variable silently ran once, not thirteen times.** zsh does not word-split on parameter expansion, so `for p in $PKGS` iterated over the whole string. It printed a clean-looking result for a check that never ran — the rubric's "a checker that finds nothing looks identical to a clean codebase," in a new disguise.
2. **The lens-1 "DAG violation" in `telemetry`, `analytics`, and `webhooks` was prose in doc comments** saying those packages must _not_ import `@grantjs/logger`. A grep for the package name matched the sentence forbidding it. Rule 2, and it would have produced three fabricated Tier 1 findings.
3. **The lens-5 sanity check was run against a symbol that does not exist.** `SYSTEM_ROLES` returned zero external hits, which read as "the check is broken" — it is simply not in `constants`. Re-proving the check with six symbols known to be imported (`canAssignRole` → 8, `ROLES` → 4, …) is what established the 89 is real. Prove a check fires with a positive control you have verified exists.

## Human gate

- [x] Gate 1: Story brief approved — 2026-08-16, Ale Heredia. Two decisions taken at the gate: pass 6 covers the internal packages only (published `client`/`server`/`cli` deferred to pass 7), and `platform` is deleted whole with nothing relocated.
