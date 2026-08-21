# Story brief — the published trio (`client`, `server`, `cli`) code quality remediation

## Metadata

- **Slug**: `published-packages-code-quality`
- **Date**: 2026-08-19
- **Author**: PM agent, from an assessment run against the pass 6 close-out, since merged as [#290](https://github.com/grant-js/grant/pull/290) — **`main` @ `76e765d4`**. Every `file:line` citation re-verified at that commit; #290 touched one plan file and no source.
- **Status**: **ready-for-main** — gate 1 cleared 2026-08-19, Ale Heredia. All slices implemented; findings written to `docs/contributing/code-quality/published-packages.md`. Awaiting gates 3 and 4.
- **Pass**: 7 of the [code quality passes](../docs/contributing/code-quality/README.md)
- **Findings document** (written by the last slice): `docs/contributing/code-quality/published-packages.md`

## Objective

Audit and remediate the **three published npm packages** — `@grantjs/client`, `@grantjs/server`, `@grantjs/cli` — plus the **five example workspaces** they ship, and close the last gap in the repo's code-quality guardrails. This is the pass where "unused" stops meaning "deletable," so the durable output is a **contract** audit, not a consistency sweep.

## This is a contract audit — lens 4 and lens 5 change meaning {#contract-audit}

Pass 6's carried input states it: `client`, `server` and `cli` are the only non-private packages (`scripts/check-publishable-packages.mjs:15-20`), and "unused export" there may mean "used by a downstream consumer you cannot grep." Two method changes follow, and they are the reason this pass is not just pass 6 repeated.

**1. Lens 5 must classify by _reachability from the published `exports` map_, not by reference count.** Measured **from the built `.d.ts` entry points** — grep gets this wrong twice over (see [note](#note)):

| Package  | Own symbols in `src` | Public surface (built `.d.ts`)  | Internal (safe to encapsulate) |
| -------- | -------------------- | ------------------------------- | ------------------------------ |
| `client` | 19                   | 21 (19 own + `Scope`, `Tenant`) | 0                              |
| `server` | 37                   | 33 (31 own + `Scope`, `Tenant`) | 6                              |
| `cli`    | 43                   | **0**                           | **43**                         |

**`@grantjs/cli` has no module API at all, and that is the pass's most useful single fact.** Its `exports` map declares only `"."`, and the built `dist/index.d.ts` is literally `#!/usr/bin/env node` + `export {};`. `src/config/index.ts` re-exports **17** symbols and is **not** in the `exports` map, so none of them is public despite looking public. **`cli`'s contract is its command surface** (`grant start`, `grant config`, `grant generate-types`, `grant version`) and its config-file format — neither of which any lens in the rubric currently reads. Lens 5 for `cli` has to be rewritten or it will audit the wrong surface.

Conversely, `client`'s and `server`'s public surfaces are **larger** than their own source exports, because each re-exports `Scope` and `Tenant` from `@grantjs/schema` — so the trio's contract includes symbols it does not define. Relevant to Tier 0.3.

**2. `knip`'s blind spot compounds here.** Pass 5's carried input (`entry: ["src/index.ts"]` makes every barrel re-export "used" by construction) still applies, and semver adds a second layer: even a correctly-detected unused export is not deletable without a major version. `knip` on these three can report only unused _files_ and _dependencies_. State that next to any zero.

## What the assessment found

### What holds — lock these in {#what-holds}

The rubric's highest-value output is locking a lens while it is green. Five results, each **verified by building the packages and inspecting `dist/`**, not by reading config:

| Check                               | Result                                                                              | Evidence                                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lens 1 — DAG                        | **Clean.** `client`→`schema`, `server`→`schema`, `cli`→nothing                      | Every `@grantjs/*` occurrence in the trio is `import type` / `export type` from `schema`, or prose in a doc comment. No trio package imports another |
| **`exports` map integrity**         | **Clean.** All 24 declared targets resolve to a real built file                     | Built all three; checked every `types`/`import`/`require` target — `client` 6 (2 subpaths), `server` 15 (5 subpaths), `cli` 3 (1 subpath + `bin`)    |
| **`bin` integrity**                 | **Clean.** `cli`'s shebang survives bundling; `bin.grant` → `dist/index.mjs` exists | `head` of the built artifact is `#!/usr/bin/env node`                                                                                                |
| **No test artefacts in any `dist`** | **Clean.** Zero `*.test.d.ts` in all three                                          | Notable because `cli`'s vite `dts` plugin has **no** `exclude` (unlike its two siblings) — its `tsconfig.build.json` `exclude` covers it. See Tier 3 |
| Logging discipline                  | **Clean, and `cli`'s 81 `console.*` calls are _not_ a violation**                   | `AGENTS.md:106` scopes the rule to "API source or runtime adapter code." A CLI's stdout is its user interface — rule 2, checked before filing        |

**The guardrail gap is the whole of Tier 1.** `eslint.config.mjs:38-39` says the published packages are "deliberately absent" from `INTERNAL_PACKAGE_DEPS`, and `.github/workflows/ci.yml` says in a comment that "only the published trio (client, server, cli) is still outside the gate; pass 7 widens it to them." The repo already knows. This pass does it.

### Tier 0 — one real defect, plus two items an earlier draft over-graded {#tier-0}

**Corrected 2026-08-19 after gate 1**, on Ale Heredia's challenge that `@grantjs/schema` is a types package whose `build` exists only so root `pnpm build` traverses cleanly. Checking that split this section in two, and the correction is the rubric's rule 2 applied to a finding this brief had already filed: **a script that does nothing is only a defect if something depends on its output.**

**0.1 `@grantjs/schema`'s `build` script is a no-op — and that is by design, not a defect.** `build` is bare `tsc`, which resolves `tsconfig.json` → root `tsconfig.json` → **`"noEmit": true`**, never overridden, so it emits nothing (verified: with `dist/` and the tsbuildinfo both removed, `tsc` exits 0 and produces no `dist/`). **Nothing consumes that output.** Production compiles schema through `scripts/docker/build-api-production.mjs`, which uses `tsconfig.build.json` (`noEmit: false`), copies `src/schema` → `dist/schema` for the SDL (`:17,:58`), and **already throws if a package emits no dist** (`:81-83`). The repo states this itself — `schema/tsconfig.build.json` carries the comment _"Read by scripts/docker/build-api-production.mjs, not by `pnpm build`."_

**Regraded to Tier 3**: the script is misleading, not broken. Either point it at `tsconfig.build.json` or make its no-op status explicit; both are hygiene.

**It does not cause 0.2 either** — that would be the same loose-causation error corrected below. 0.2's mapping is dead because of `declaration: false`, regardless of which tsconfig `build` names. What 0.1 contributes is only the _asymmetry_ that makes the hazard intermittent: the production script creates `schema/dist`, `pnpm build` neither creates nor cleans it, so whether a checkout has one is a matter of what was last run there.

**Note the package is not types-only, even though the SDKs treat it as such.** Schema exports **172 runtime values** — 117 gql `*Document` constants (imported across 55 `apps/web` hook files and handed to Apollo at runtime), 47 enums (e.g. `Object.values(AuthorizationReason)` at `authorization.schemas.ts:11`), 6 const objects, 2 functions — plus `.graphql` SDL loaded off disk at runtime by `apps/api/src/graphql/resolvers/index.ts:35`. `client` and `server` are the special case: they use it **type-only**, zero value imports. That asymmetry is what makes 0.3 a real question rather than a theoretical one.

**0.2 `client` and `server` map `@grantjs/schema` to a file that can never exist — and it fails _open_. This is the real Tier 0.** Both tsconfigs carry `"paths": { "@grantjs/schema": ["../schema/dist/index.d.ts"] }` (`client/tsconfig.json:10`, `server/tsconfig.json:13`). The shared build parent sets **`"declaration": false`** (`packages/@grantjs/tsconfig.build.json`), so no build path in the repo — including production's — emits `dist/index.d.ts`. It is permanently dead config, not merely unbuilt. Verified in both directions:

- `schema/dist/` **absent** → `turbo type-check --force` on both **passes** — resolution silently falls back to node, finding `schema`'s `main: src/index.ts`.
- `schema/dist/` **present but stale** → `client` type-check **fails with 7 × TS6059** (`'../schema/dist/index.js' is not under rootDir`).

So the trio's type-check outcome depends on filesystem state left behind by a different tool, and the `paths` entry — the thing that looks like it is doing the work — has never resolved once. Turbo's cache hides it further: the cached run was green and `--force` was red on the same tree.

**0.3 `@grantjs/schema` is published with `main`/`types` pointing at raw TypeScript.** `main: "src/index.ts"`, `types: "src/index.ts"`, `files: ["dist/**/*", "src/**/*"]` — and the `dist/**/*` half is never produced by any build the published package runs, so the `files` array advertises something that will not be in the tarball. It is a **runtime `dependencies`** of both SDKs, so every npm consumer installs a package whose declared entry point Node cannot execute.

**This is survivable only because of the type-only asymmetry in 0.1**: the SDKs never import a value from schema, so a consumer's bundler resolves the `types` entry and never asks Node to load the `main` one. That works for `tsc` and for bundlers that read `node_modules` TypeScript; it does not work for a consumer that resolves `@grantjs/schema` as a runtime module, and nothing stops one from trying. **Regraded to Tier 1** — a published-metadata defect with a real but narrow blast radius, not an active break.

**0.2 is the slice; 0.1 and 0.3 ride with it.** They are one area, not one chain — an earlier draft claimed 0.1 _caused_ 0.3, which is wrong: `files` advertising `dist/**/*` is independent of which tsconfig `build` names. Note this is `@grantjs/schema`, which pass 5 audited — pass 5 treated it as an internal codegen package and never looked at its **published** shape. That is the seam, and it belongs to this pass.

### Tier 1 — guardrails, and two release-config gaps

**1.1 No ESLint DAG rule and no `dead-code` gate for the trio.** `INTERNAL_PACKAGE_DEPS` covers 12 packages; `dead-code:packages` covers the same 12. Derive each allowed set from the package's own `package.json` (pass 4's carried input — `client`/`server` allow `@grantjs/schema`, `cli` allows nothing) and **prove each fires by planting a real import** (pass 3's carried input).

**1.2 The example workspaces are outside every gate — and one of them ships.** Measured with `turbo <task> --dry-run=json`, filtering `command !== '<NONEXISTENT>'` (pass 6's carried input):

| Workspace               | Lines | `lint` | `type-check` | Note                                                       |
| ----------------------- | ----- | ------ | ------------ | ---------------------------------------------------------- |
| `example-express`       | 128   | **✗**  | **✗**        |                                                            |
| `example-fastify`       | 147   | **✗**  | **✗**        |                                                            |
| `example-nestjs`        | 172   | **✗**  | **✗**        |                                                            |
| `example-nextjs`        | 788   | ✓      | **✗**        |                                                            |
| `example-nextjs-client` | 1,122 | ✓      | **✗**        | **Built as a Docker image in `release.yml:78,93,123,308`** |

2,357 lines across 5 workspaces; **none is type-checked**, three are never linted, and the largest is a released artifact. These are the documentation consumers read first — an example that does not compile is a contract defect.

**1.3 `.changeset/config.json` classifies 25 of 27 workspaces; `@grantjs/env` and `@grantjs/webhooks` are in neither `fixed` nor `ignore`.** Every other internal package is in `ignore`. Both are `private: true` so neither can be published — but both will take independent version bumps and CHANGELOG files while their 12 siblings stay pinned. Cheap fix, and this is the pass that owns release config.

**1.4 `release:check` never runs.** `scripts/check-publishable-packages.mjs` — the script that enforces _exactly which packages may be published_ — is wired to `package.json:67` as `release:check` and referenced by **no workflow**. The guardrail on this pass's own subject matter is manual. This is pass 6's "check that the runner runs the check," one level up again.

### Tier 2 — five definitions of one type; the SDL is the source of truth {#tier-2}

**Decided at gate 1, 2026-08-19, Ale Heredia: the SDKs adopt the codegen'd types from `@grantjs/schema`. Minor bump, no major, lockstep 1.5.x preserved.**

`ApiError`, `AuthorizationResult`, `Permission` and `Resource` are byte-identical across `client/src/types.ts` (175L) and `server/src/types.ts` (107L) — including doc comments. `AuthorizationResult` alone has **five** definitions:

| #   | Where                                                                                         | Note                                                |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | `schema/src/schema/auth/types/authorization-result.graphql` → `generated/schema-types.ts:416` | **The source of truth**                             |
| 2   | `core/src/types/index.ts:132`                                                                 | Exported from core's barrel, **imported by nobody** |
| 3   | `client/src/types.ts:121`                                                                     | Hand-written                                        |
| 4   | `server/src/types.ts:41`                                                                      | Hand-written, identical to 3                        |
| 5   | `apps/api/src/rest/schemas/authorization.schemas.ts:15-21`                                    | zod validator, under-specified — see 2.3            |

**There is one contract, not a REST one and a GraphQL one.** Both SDKs call exactly one endpoint — `POST /api/auth/is-authorized` (`client/src/grant-client.ts:142`, `server/src/grant-client.ts:63`) — and that route returns the handler's value directly (`auth.routes.ts:467`), typed `AuthorizationResult` from `@grantjs/schema` the whole way down (`auth.service.ts:3,18`, `auth.handler.ts:671`). REST and GraphQL serialize **the same object**. An earlier draft of this brief read the zod schema's `z.unknown()` as evidence of a second contract and proposed a hand-written shared module; that was wrong, and it would have worked against `AGENTS.md` § API surface, which requires exactly the reuse being decided here.

**2.1 Adopt the codegen'd types.** `client` and `server` drop their hand-written `AuthorizationResult`, `Permission` and `Resource` and re-export schema's. The delta on the public surface:

| Field                                                   | SDK today       | Codegen                        | Breaking?         |
| ------------------------------------------------------- | --------------- | ------------------------------ | ----------------- |
| `authorized`                                            | `boolean`       | `boolean`                      | no                |
| `__typename?`, `evaluatedContext?`, `matchedCondition?` | absent          | added, all optional            | no                |
| `matchedPermission?`                                    | narrow, 7-field | `Maybe<Permission>` (superset) | adds `null`       |
| `reason?`                                               | `string`        | `Maybe<AuthorizationReason>`   | adds `null`, enum |

Required fields are unchanged — `authorized` only — so consumers constructing values are unaffected. The two deltas (`null` entering the optional unions, `reason` becoming an enum) are cases where **the old types misdescribed a payload that already carried those values**. This is a bug fix, shipped as a **minor**. Optional polish if extra safety is wanted: `reason?: AuthorizationReason | (string & {}) | null` stays assignable in both directions while giving autocomplete on the 8 values.

**2.2 Delete `core`'s orphan** (`core/src/types/index.ts:132`) — free, nothing imports it.

**2.3 `ApiError` is the one shape with no codegen source**, because it is the REST error envelope and is not in the SDL. Three fields, duplicated in both SDKs, plus a fourth variant in `cli` (`ApiErrorBody`, `api/client.ts:22`). Either add it to the SDL or leave it duplicated — it blocks nothing and should not hold up 2.1.

**2.4 A genuine `apps/api` defect surfaced by this analysis — deferred, not actioned.** `authorization.schemas.ts:18` validates `matchedPermission` as `z.unknown()`, so the **published OpenAPI document describes it as untyped** while GraphQL describes it fully — same payload, two qualities of documentation. The fix is to mirror the SDL there.

**Deferred at gate 1** (2026-08-19, Ale Heredia): it is in `apps/api`, not the trio, and pass 6's carried input is explicit that a pass should not widen to absorb outside work. It goes to the findings document's **Backlog** and becomes a follow-up story with a `Parent:` pointer back to this stack — the same route pass 4's five characterized-but-unfixed behaviours took to [`2026-08-14-database-cq-followups-brief.md`](./2026-08-14-database-cq-followups-brief.md). Recording it is the deliverable here; fixing it is not.

### Tier 3 — divergent styles

**3.1 `server` ships a fifth error hierarchy that shadows `core`'s names.** `server/src/errors.ts` declares `GrantServerError` + `AuthenticationError`, `AuthorizationError`, `BadRequestError`, `NotFoundError` — four names `@grantjs/core` already owns, with different constructor signatures. `client` throws 3 raw `Error`s and `cli` 18.

**None of this can comply, and the reason is structural** — the same shape as `env`'s exemption in pass 6, one level more consequential. Importing `@grantjs/core` into a published package would add a **private, unpublished** workspace package to the npm dependency graph of the SDKs. Complying is not possible; **record the exemption in `AGENTS.md` with its reason**, and do not convert these throws. This is the rubric's "unfollowable rule" case, filed against the rule.

**3.2 Three of the six `tsconfig.build.json` dialect outliers are the trio.** Pass 6 left this open at 12-extend-shared vs 6-extend-own; `client`, `cli` and `server` are three of the six (the others: `core`, `database`, `env`). Pass 7 owns half the open item and should say explicitly whether the published packages _should_ converge — they have real reasons to differ (`declaration`, `declarationMap`, per-package `paths`).

**3.3 Two mechanisms for keeping tests out of `dist`.** `client` and `server` set `exclude` on the vite `dts` plugin; `cli` sets it only in `tsconfig.build.json`. Both work — verified, zero test `.d.ts` in any dist — but a contributor copying `cli`'s vite config into a new package would ship its tests. One-line convergence.

### Tier 5 — ubiquitous language (glossary only, do not rename)

- **`GrantClient` is exported by two published packages with different meanings** — browser SDK (`client`, 316L, with cache + refresh coalescing + MFA step-up) and server SDK (`server`, 155L, no cache). Configured by `GrantClientConfig` vs `GrantServerConfig`. Both are semver-public; renaming is a major.
- **`AuthorizationError` means one thing in `@grantjs/core` and another in `@grantjs/server`** (3.1).

Record in `CONCEPTS.md` with citations. **Do not rename in this pass** — these reached npm, which is the strongest form of contract the repo has.

### Lens 7 — coverage, run as a detector {#coverage}

The trio has real tests (13 files, 2,737 test lines against 4,063 runtime lines) — unlike pass 6's zero. The gap is concentrated and it is in `server`:

| Package  | Runtime lines | Test lines | Untested runtime files                                                                                                                   |
| -------- | ------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `client` | 938           | 1,347      | 3 — `types.ts`, and 2 barrels. Effectively complete                                                                                      |
| `server` | 1,293         | 785        | **11 of 20**, incl. `utils/token-extractor.ts` (102L), `nest/grant.module.ts`, `nest/grant.decorator.ts`, `errors.ts`, all 4 sub-barrels |
| `cli`    | 1,832         | 605        | 3, dominated by `commands/config-cmd.ts` (**304L**)                                                                                      |

**`server/src/utils/token-extractor.ts` is this pass's SSRF-guard** — the single highest-value place to run lens 7 as a detector, exactly as `webhooks/ssrf.ts` was for pass 6. It is the function that decides **which bearer token a request is authenticated with**, it is reached by every one of the four framework adapters, and it has no tests. It is also **published API**: `extractBearerToken` and `extractTokenFromRequest` both appear in the built `dist/index.d.ts`, so its behaviour is a semver contract and not merely an internal detail. It hand-rolls cookie parsing (`parseCookieHeader`) rather than using a library, splitting on `;` and `=` with no URL-decoding, and on a duplicate cookie name **the last value wins**.

Whether last-wins is exploitable depends on deployment (cookie shadowing from a subdomain is a real attack class), and the point of the rubric is that **this is a question to answer with tests, not with reading**. Characterize first — assert what it does today, including what looks wrong — then decide separately whether each behaviour is a defect. Pass 6's SSRF work found that the classic bypasses failed for a reason nobody had written down; expect the same shape here, in either direction.

## Acceptance criteria

- [ ] **The dead `paths` mapping is gone and the fragility is proven gone** (0.2). Verified by `turbo type-check --force` (never a cached run) with a **stale `schema/dist/` deliberately planted** — a clean tree passing proves nothing, because it passed before the fix too.
- [ ] **`@grantjs/schema`'s published metadata describes what actually ships** (0.3) — `files` no longer advertises a `dist/**/*` the published build never produces, and the `main`/`types` decision is recorded with its reasoning. Verified with `npm pack --dry-run`, not by reading `package.json`.
- [ ] **`schema`'s `build` script is honest** (0.1) — pointed at `tsconfig.build.json` or explicitly marked a no-op, with the production path (`build-api-production.mjs`) left working. **The production API image still builds** — verified, not assumed (pass 5's C3 broke exactly this).
- [ ] **Guardrails reach the trio and are proven to fire.** ESLint DAG rules with each allowed set derived from that package's own `package.json`, plus `dead-code` coverage. Each rule proven by planting a real violation, never by a green run on a clean tree. The `knip` blind spot stated next to any zero.
- [ ] **The five example workspaces are type-checked in CI**, and the three unlinted ones are linted. `example-nextjs-client` especially — it is a released Docker artifact.
- [ ] **`release:check` runs in CI**, so the publishable set is enforced rather than documented.
- [ ] **`@grantjs/env` and `@grantjs/webhooks` are classified in `.changeset/config.json`.**
- [ ] **`token-extractor.ts` is characterized by tests**, reviewed by Security independently of their author. **Every test mutation-checked** — mutate the code, confirm red, and assert the mutation actually applied (pass 4 and pass 6 carried inputs).
- [ ] **`server`'s untested surface is materially reduced**, prioritized by lines at risk, not file count.
- [ ] **The SDKs reuse `@grantjs/schema`'s codegen'd types** — `AuthorizationResult`, `Permission`, `Resource` re-exported rather than redefined in both packages, `core`'s orphan deleted, and the whole change landed as a **minor** with the 1.5.x lockstep intact. Verified by diffing the built `.d.ts` before and after, so the public-surface delta is the measured one in [Tier 2](#tier-2) and nothing more.
- [ ] **The published-package error-vocabulary exemption is recorded in `AGENTS.md`** with its structural reason, alongside `env`'s.
- [ ] **`AGENTS.md`'s published-trio description is corrected** — in particular that `@grantjs/cli` has no module API.
- [ ] **`docs/contributing/code-quality/README.md`'s pass table** marks pass 7 done and leaves pass 8 (`apps/config`) named.
- [ ] **Findings document written** with `file:line` citations throughout, including a **Backlog** section carrying the deferred items — [2.4](#tier-2) above at minimum — in the shape pass 4's backlog used, so a follow-up story can be scoped from it without re-deriving the evidence.
- [ ] **Carried inputs written into the README table** for pass 8.

## Non-goals

- **`apps/config`** — pass 8. 31 files, 4,839 lines. Not audited here, and not folded in to make the table look finished.
- **Renaming `GrantClient` or `server`'s error classes** — Tier 5 stays a `CONCEPTS.md` entry. These reached npm.
- **Converting `cli`'s 81 `console.*` calls** — not a violation; the rule is scoped to API and adapter code.
- **Converting the trio's 21 raw `throw new Error`s to `@grantjs/core` domain errors** — structurally impossible without publishing `core`. Recorded as an exemption, per Tier 3.1.
- **Any major version bump.** Ruled out at gate 1: the trio is at `1.5.3` and version-locked to `schema`, `grant-api`, `grant-web` and `grant-docs` via `.changeset/config.json`'s `fixed` group, and keeping the platform in lockstep on 1.5.x is the priority. Any finding whose only fix is a major is **recorded, not actioned** — including a hard narrowing of `reason` to the bare enum ([Tier 2](#tier-2)).
- **Adding hand-written type modules to `@grantjs/schema`.** Considered and rejected: `AGENTS.md` § API surface centralizes types via **codegen**, and the SDL is the source of truth. If a shape belongs in schema, it belongs in the SDL.
- **Pass 6's open items** (`webhooks` IPv6 literals, `jobRegistry`'s documented-but-unwired path, the 40 cross-file exports, factory style). They stay on `internal-packages.md`'s backlog.
- **Fixing `apps/api`'s `matchedPermission: z.unknown()` OpenAPI defect** ([2.4](#tier-2)) — deferred at gate 1 to a follow-up story. This pass **records** it in the findings backlog and does not touch `apps/api`.

## Risk flags

- [x] **Auth / sessions / tokens** — `token-extractor.ts` decides which credential authenticates a request, across all four framework adapters, and is untested. Its slice is **`security-full`**, reviewed by Security independently of its author. If characterization surfaces a real bypass, that is a Tier 0 and the finding escalates.
- [x] **Published npm artefacts change.** Every slice touching `exports`, `files`, `main`, `types`, `bin` or the build chain alters what consumers install. Verify by building and inspecting `dist/` — a green `tsc` is not evidence (pass 5's C4).
- [x] **A released Docker image is in scope** — `example-nextjs-client` (`release.yml`). Adding a type-check gate to a workspace that has never been type-checked may surface pre-existing errors; budget for them.
- [ ] Tenancy / RLS / org scoping — not touched.
- [ ] Permissions / RBAC — the trio _consumes_ the permission model; this pass does not change it.

## Suggested active roles

- **Project Manager** — gates, findings document
- **Principal Engineer** — slice order, integration. **0.2 must land first**: no later slice's Verifier step can be trusted while `turbo type-check` returns a different answer depending on whether a stale `schema/dist/` happens to exist
- **Architect** — the Tier 0 publish-boundary chain. The Tier 2 types decision is already taken; Architect's remaining job there is confirming the built `.d.ts` delta matches the table and nothing else moved
- **Senior Backend** — guardrails, build chain, release config, `server` coverage
- **Senior Frontend** — active this time, unlike pass 6: `client` is a React SDK and two of the five examples are Next.js apps entering the type-check gate
- **Senior QA** — load-bearing again. Lens 7 is the detector, and `token-extractor.ts` is where it points
- **Senior Security** — **blocking** on the `token-extractor` slice
- **Verifier** — after every slice; `turbo type-check --force` rather than cached, plus a clean-build `dist/` listing

## Note on how this brief was produced {#note}

Every count was measured against `f7ff1b2d`. Four checks were wrong on the first attempt, and three are the rubric's own carried inputs biting the pass that quotes them:

1. **A symbol extractor over an unquoted variable produced "1 exported symbol" per package.** `grep` here is `ugrep`, and zsh does not word-split parameter expansion, so a newline-joined file list was passed as a single filename. It printed a clean-looking number for a check that never ran — **pass 6's C2, verbatim, in a new disguise.** Re-run with `find -print0 | xargs -0`, and proven with a positive control (`GrantClient`, known to exist) before any count here was trusted.
2. **Three of `server`'s "exports" were prose in JSDoc `@example` blocks** — `GET`, `POST` and `AppModule` matched `* export const GET = ...` inside comments. This is pass 6's _other_ rule-2 catch repeating exactly. Filed nowhere, because they are not exports.
3. **The corrected grep was still wrong, and the fix was to stop grepping.** It missed `export async function` and bare `export { X }`, undercounting `cli` by 12 (31 → 43) and `server` by 1. **All public-surface numbers in this brief are parsed from the built `.d.ts` entry points instead** — which is also the only method that can see that `cli`'s public surface is zero. Rule 1's real lesson is not "run the tool," it is "run the tool that measures the thing you are claiming": the claim was about a published contract, so the artifact is the only valid source.
4. **The first `tsc --noEmit` run on `client` and `server` failed, and it was not a finding.** It ran against a stale `schema/dist/` before `schema` was rebuilt. Chasing it, however, is what uncovered Tier 0.1–0.3 — the _reason_ the stale dist existed is that `schema`'s build never emits. A wrong first result that is investigated rather than discarded is worth more than a right one.
5. **`turbo type-check` was green and `turbo type-check --force` was red on the same tree.** Every type-check claim in this brief is from a forced run. Add this to the "prove the check fires" family: a cache hit is not a check.

6. **Tier 0.1 and 0.3 were over-graded, and the challenge that caught it came from the gate.** This brief filed "schema's build emits nothing" as a Tier 0 defect without asking **who consumes the output**. Nobody does — production compiles through `build-api-production.mjs` with a different tsconfig, and `schema/tsconfig.build.json` says so **in a comment**, which the assessment read past. That is rule 2 (a rule violation is not automatically a defect) applied one level up: _a script that does nothing is only a defect if something depends on its output._ Two of the three Tier 0 items were regraded; the survivor (0.2) got **stronger**, because `declaration: false` in the shared build parent means `dist/index.d.ts` can never exist on any path.

   The general lesson for pass 8: **trace the consumer before grading the producer.** Finding that a build step is inert is half a finding — the other half is who was relying on it, and that half is where the tier comes from.

7. **A `rm -rf` silently did not run.** `rm -rf dir packages/…/*.tsbuildinfo` aborted under zsh's `nomatch` when the glob matched nothing, so the directory it was also supposed to delete survived — and the next command read the leftover as current state. Third distinct zsh-specific failure in this assessment after the unquoted-variable loop, all with the same signature: **the shell reported something, and the something was not the thing that was asked for.**

The working tree was left clean; every artefact touched (`dist/`, `*.tsbuildinfo`) is gitignored, verified with `git status` and `git check-ignore`.

## Human gate

- [x] Gate 1: Story brief approved — **2026-08-19, Ale Heredia.** Three decisions were taken and are recorded above rather than left open:
  1. **The SDKs adopt `@grantjs/schema`'s codegen'd types** rather than keeping hand-written copies or introducing a shared hand-written module — see [Tier 2](#tier-2).
  2. **No major version bump**, in this pass or as a consequence of it. The platform stays in lockstep on 1.5.x; anything that would need a major is recorded and deferred.
  3. **[2.4](#tier-2) is deferred to a follow-up story** — it is an `apps/api` defect, and this pass records it in the findings backlog rather than widening to fix it.

  Scope (three packages + five example workspaces) and the **Tier 0 build chain landing as slice 1** were both approved at the same gate. Stack plan: [`2026-08-19-published-packages-code-quality-stack.md`](./2026-08-19-published-packages-code-quality-stack.md).
