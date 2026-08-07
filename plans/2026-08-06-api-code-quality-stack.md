# Stack plan — API code quality remediation

## Metadata

- **Slug**: `api-code-quality`
- **Story brief**: [`plans/2026-08-06-api-code-quality-brief.md`](./2026-08-06-api-code-quality-brief.md)
- **Findings**: [`docs/contributing/code-quality/api.md`](../docs/contributing/code-quality/api.md)
- **Status**: approved (2026-08-06, Ale Heredia)
- **Story trunk**: `feat/api-code-quality`
- **worktree_path**: `.worktrees/api-code-quality` (required only if another story is in flight)

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [ ] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

## Ordered slices (PRs)

| #     | Branch                              | Base                    | Concern                               | Owner role | Review bar        | PR  |
| ----- | ----------------------------------- | ----------------------- | ------------------------------------- | ---------- | ----------------- | --- |
| 1     | `feat/api-code-quality-bugs`        | `feat/api-code-quality` | Tier 0 bugs + error re-exports        | Backend    | light             |     |
| 2     | `feat/api-code-quality-guardrails`  | trunk                   | Tier 1 mechanical fixes               | Backend    | light             |     |
| 3     | `feat/api-code-quality-lint`        | slice 2                 | Lint enforcement                      | Backend    | light             |     |
| 2a    | `feat/api-code-quality-cdm-ports`   | trunk                   | ProjectImport/Export repository ports | Backend    | light             |     |
| 4     | `feat/api-code-quality-deadcode`    | trunk                   | Dead surface removal                  | Backend    | light             |     |
| 4a    | `feat/api-code-quality-cache-tests` | slice 4                 | `CacheHandler` characterization tests | QA         | light             |     |
| 5     | `feat/api-code-quality-cache`       | slice 4a                | `CacheHandler` + scope helpers        | Backend    | **security-full** |     |
| 6     | `feat/api-code-quality-services`    | slice 4                 | Service helpers                       | Backend    | light             |     |
| 7     | `feat/api-code-quality-routes`      | slice 4                 | REST CRUD router factory              | Backend    | light             |     |
| 8     | `feat/api-code-quality-validation`  | slice 6                 | Pagination + CDM zod boundary         | Backend    | **security-full** |     |
| 9     | `feat/api-code-quality-tests`       | slice 5                 | Base-class + route coverage           | QA         | light             |     |
| final | `feat/api-code-quality`             | `main`                  | integration                           | Principal  | deep              |     |

Slices 1, 2 and 4 are independent and could run in parallel with multiple agents in separate worktrees. **With a single reviewer, run them serially** — parallel slices compete for review attention and create rebase churn for no gain.

5–7 all depend on 4: do not refactor code that slice 4 deletes. Slice 5 additionally depends on 4a — see below.

---

## Slice detail

### 1 — Tier 0 bugs + error re-exports

- `await` the two cache mutations in `handlers/tags.handler.ts:99,142`.
- Return `hasNextPage` from `repositories/webhook-deliveries.repository.ts` and consume it in `services/webhook-subscriptions.service.ts:213` instead of recomputing.
- Add `NoSessionSigningKeyError`, `TokenExpiredError`, `TokenInvalidError`, `TokenValidationError` to the `lib/errors/error-classes.ts` re-export.

Each bug gets a regression test. The re-export must land here because slice 2 depends on it.

### 2 — Tier 1 guardrail fixes

Mechanical, no behaviour change: 7 domain-error imports, 9 raw `Error` throws, 14 logger call sites + 3 dead fields, 7 relative `PivotRepository` imports, ports for the 3 port-less services and 2 port-less repositories, `EmailService` port relocated to `ports/services/`.

Config extraction: `server.ts:161-164` → `config.app.url`; the three OAuth TTLs; page-size and audit-truncation literals. **Resolve the 10-vs-50 default page-size conflict explicitly** — it is a behaviour change either way, so state which one wins.

Move `rest/utils/refresh-cookie.ts` to `lib/` and update the 6 GraphQL importers. Decide whether `handlers/index.ts` is a legitimate third composition site and either amend `AGENTS.md:46` or move the wiring.

### 2a — CDM repository ports (split out of slice 2)

Ports for `ProjectImportRepository` (15 public methods) and `ProjectExportRepository` (18).

Split out because this is **not** a mechanical guardrail fix, as slice 2 assumed. Every return type — `ProjectRoleWithPermissions`, `ProjectUserWithRoleIds`, `ProjectTagDefinitionRow`, `GrantGroupExportRow`, `ResolvedCdmPermission`, and ~8 more — is declared **inside the repository files in `apps/api`**. Writing the ports means first migrating those declarations into `@grantjs/core`, which changes what core owns (CDM export row shapes become domain types) and touches every importer.

That is a design decision about domain ownership, not an import fix, and it deserves its own review. Follow the existing convention: `transaction?: unknown` in repository ports.

### 3 — Lint enforcement

Encode slice 2's rules so they cannot regress:

- `@typescript-eslint/no-floating-promises` (type-aware) — would have caught bug 1.1
- `no-restricted-imports` for the `AGENTS.md` symbol table
- `eslint-plugin-boundaries` or `dependency-cruiser` for the layer DAG — **currently 100% clean**, so this locks in a green state
- `knip` or `ts-prune` in CI

Expect the first full-repo run to surface violations in `apps/web` and `packages/`. Scope the rules to `apps/api` here; widening them belongs to those units' own passes.

### 4 — Dead surface removal

**Done.** The estimate of "~115 exports" was low and, more importantly, conflated three edits. `knip` reports **361**:

| Class                 | Count | Edit                                            |
| --------------------- | ----- | ----------------------------------------------- |
| Dead barrel re-export | 90    | delete the barrel line; implementation lives on |
| Module-private        | 149   | drop the `export` keyword; no code moves        |
| Genuinely dead        | 124   | delete the declaration (~870 lines)             |

Plus 7 unused dependencies and **13** dead `CacheHandler` methods — not the 2 estimated; knip does not analyse class members, so that took a separate AST scan. `CacheHandler` is down to 812 lines before slice 5 touches it.

The per-group decision on orphaned REST schemas turned out not to exist: every one has a live `my*`-prefixed counterpart already wired into `me.routes.ts` and `me.openapi.ts`. They are superseded duplicates from the `me`-scoped rewrite, not abandoned endpoints.

Two `duplicates` findings remain deliberately unresolved — `jsonSchema`/`metadataSchema` and `webhookScopeQuerySchema`/`listWebhookSubscriptionsQuerySchema`. Both names are live in each pair, so settling them is a rename, which this story scoped out. Recorded in [`CONCEPTS.md`](../CONCEPTS.md) and excluded in `knip.json`.

Enforcement is on: `dead-code:api` runs in CI and in the pre-push hook, verified against a planted violation.

### 4a — `CacheHandler` characterization tests

**Blocks slice 5.** Not optional and not deferrable to slice 9.

`handlers/base/cache-handler.ts` is 888 lines, has no dedicated test file, and decides what entity IDs every caller is allowed to see. Refactoring it without tests risks a cross-tenant data leak — the failure mode e2e suites are least likely to catch, because a leak looks like a successful response.

Characterize **current** behaviour, bugs included. Do not fix anything here:

- All 9 `getScopedXIds` across every `Tenant` variant they handle, including the `Account` cases that intentionally return `[]` and the `default:` `BadRequestError`.
- The `ProjectUser` intersection logic at `:307-324` — the subtlest branch in the file.
- Cache hit vs miss paths: a hit must not call `scopeServices`; a miss must write the computed set back.
- The add/remove wrappers and each `invalidateXCacheForScope` namespace.

These tests are the correctness check for slice 5: write them against the current 9 methods, refactor, and they must pass **untouched**. If a test needs editing to go green, the refactor changed behaviour — stop and review why.

**Done.** 160 tests in `tests/unit/handlers/base/`, over a file that is now 812 lines after slice 4:

- `cache-handler.scoped-ids.test.ts` (92) — an 8×8 tenant dispatch matrix, cache hit/miss semantics per namespace, the `ProjectUser` intersection, and the `getScopedProjectAppIds` guard.
- `cache-handler.mutations.test.ts` (68) — the 18 add/remove wrappers, the invalidators, and the authorization cache key.
- `cache-handler.fixtures.ts` — in-memory cache namespaces rather than stubs, because several behaviours are about what ends up _in_ the cache.

Verified by mutation testing rather than by passing: **8 of 8 planted behaviour changes are caught**, including the two that matter most — dropping the `ProjectUser` role filter (privilege escalation) and dropping `grantedScopes` from the authorization cache key (two OAuth grants sharing one result). A suite that passes proves nothing; one that fails on the right mutations is the actual gate for slice 5.

Asymmetries recorded as current behaviour, deliberately not fixed here:

| Behaviour                                                                                           | Note                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `getScopedTagIds` returns real tags for an `Account` scope                                          | roles/users/groups/permissions return `[]` for the same scope |
| `getScopedUserIds`/`GroupIds`/`PermissionIds` reject `ProjectUser`                                  | `getScopedRoleIds` accepts it                                 |
| `getScopedProjectIds` on an `OrganizationProject` scope returns **every** project of the owning org | not just the one named in the scope id                        |
| `getScopedProjectAppIds` does not cache its empty result                                            | the guard re-runs on every call                               |
| `invalidateSigningKeysCacheForScope` prefix is not delimiter-anchored                               | `organization:org-1*` also matches `organization:org-10`      |

### 5 — `CacheHandler` + scope helpers · security-full

The highest-risk slice. `CacheHandler` decides what every caller may see; a mistake here is a tenancy leak.

- Collapse 9 `getScopedXIds`, 22 add/remove wrappers, and 8 `invalidateXCacheForScope` into a descriptor table plus three generics.
- **Keep every public method name as a one-line delegate** — no handler changes, no test churn, reviewable diff.
- Extract `lib/scope.lib.ts` and replace the 8 inline `.split(':')` sites.
- Fix `invalidateSigningKeysCacheForScope:873` to use `createCacheKey`.

Slice 4a's tests must be green on this branch before the refactor begins, and must still pass unmodified when it ends.

**Done**, with two items of the plan corrected:

| Planned                                           | Actual                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collapse 9 `getScopedXIds`                        | Done — descriptor table + one generic. ~350 lines of switch statements become a table read as an authorization matrix.                                                                                                                                                                                                                                                                  |
| Collapse 22 add/remove wrappers                   | **Not done, and should not be.** There are 18, and each is already a 3-line delegate. Any "collapse" either changes the public API — which this slice forbids — or swaps a direct `this.cache.roles` reference for a string key, which is indirection, not simplification.                                                                                                              |
| Collapse 8 `invalidateXCacheForScope`             | Moot: slice 4 deleted 8 of the 10 as dead. Two remain and share nothing.                                                                                                                                                                                                                                                                                                                |
| Extract `lib/scope.lib.ts`, 8 `.split(':')` sites | There are **26**. Grew the existing `project-id-from-scope.lib.ts` into `scope.lib.ts` — its JSDoc already admitted it "mirrors `CacheHandler.extractProjectIdFromScope` without throwing" — and migrated CacheHandler's 4. The other 22 are left to a follow-up: widening a security-full diff to touch 22 unrelated call sites makes the tenancy change harder to review, not easier. |
| Fix `invalidateSigningKeysCacheForScope`          | Done. Note this is a de-duplication only: the inline `${scope.tenant}:${scope.id}` was already byte-identical to `createCacheKey`.                                                                                                                                                                                                                                                      |

Verified by re-running `mutation-check.mjs` against the collapsed shape: **10/10 killed**, including two new mutations for failure modes the descriptor table introduces (a wrong `namespace`, a tenant entry moved to the wrong key). The write-back mutation now fails 9 tests where it failed 2, which is the evidence that the nine methods really do share one path.

The 160 characterization tests pass **byte-identical** — verified by md5 against a baseline taken before the first edit.

### 6 — Service helpers

- `resolveDelete()` for the delete+audit+event block — 43 services.
- `validatePage()` for the list+`validateOutput` block — 12 services, also removes the discarded allocation.
- `intersectScopedIds()` for the empty-scope early return — 9 handlers.
- Normalize `metadata` vs `auditMetadata`.

**Done — two of the four items were rejected on inspection.**

| Item                          | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validatePage()`              | **Done.** 12 sites, 89 lines removed. The clearest win in the slice: the throwaway object existed only to reshape `{ <entityPlural>, totalCount, hasNextPage }` into `{ items, … }` for the schema.                                                                                                                                                                                                                                                                                                        |
| `intersectScopedIds()`        | **Done**, 9 handlers — but for the naming, not the 18 lines. The helper documents an authorization rule that inline code did not: an absent id filter means _everything the scope allows_, never _nothing_, and a caller can never widen visibility by naming ids. Covered by tests.                                                                                                                                                                                                                       |
| `resolveDelete()`             | **Rejected.** The audit's "43 services share a 30-line block" counts the whole delete method — repository call, `oldValues`, metadata, audit, event, `validateOutput` — not an extractable unit. Normalized, the 43 audit branches collapse to 3 semantic variants, and the dominant one (32 of 43) is already **5 lines**. A helper taking `{ isHardDelete, entityId, oldValues, newValues, metadata }` plus `audit` and `transaction` would be 7–8 lines at the call site. That is not a simplification. |
| `metadata` vs `auditMetadata` | **Rejected — the divergence is load-bearing.** `groups.service.ts` binds `metadata` from `validatedParams` because a Group _has_ a metadata field; `auditMetadata` disambiguates. Renaming produced `TS2451: Cannot redeclare block-scoped variable`. Recorded as [correction 13](../docs/contributing/code-quality/api.md#corrections).                                                                                                                                                                   |

The rejected pair is the same shape as slice 5's add/remove wrappers: the audit counted repeated _shapes_ and assumed each implied an extractable helper. Where the repeated block is already minimal, a helper relocates complexity into a parameter object instead of removing it.

### 7 — REST CRUD router factory

`createCrudRouter({ resource, schemas, handler })` for `groups`, `roles`, `permissions`, `tags`, `resources`. Preserve the middleware order exactly: `validate` → `requireEmailThenMfaRest` → `authorizeRestRoute` → handler.

OpenAPI registration must stay in sync — `rest/openapi/` is generated separately from the routes, so verify the emitted spec is byte-identical before and after.

**Done for three of the five.** Measured similarity after normalizing the entity name out:

| Pair                     | Identical                                         |
| ------------------------ | ------------------------------------------------- |
| `roles` vs `permissions` | **100%**                                          |
| `groups` vs either       | **99%** — one line, an import ordering difference |
| `tags` vs the group      | 79%                                               |
| `resources` vs the group | 81%                                               |

So the audit was right about the three it named specifically, and the "5 files of ~158 L each" framing was optimistic. `tags` and `resources` are excluded on purpose: `tags` deletes via a **body** schema rather than a query schema and exposes no `requestedFields`; `resources` adds an `isActive` filter, hardcodes `requestedFields` to `[]`, and passes `context.locale` into create. Folding either in means options only one caller ever sets — the failure mode slice 6 rejected `resolveDelete()` for.

**474 lines of route definitions become 56.** The middleware order is preserved exactly and documented at the factory, including why GET is the one route without the MFA guard.

Spec check done as specified: `/api-docs.json` captured from the e2e stack before and after is **byte-identical** — same md5, 1,771,662 bytes, 87 paths. That was expected rather than hoped for, since `rest/openapi/` has zero imports from `rest/routes/`, but the plan asked for the empirical check and it is cheap.

### 8 — Pagination + CDM validation · security-full

- Pick one `hasNextPage` implementation, put it in one place, migrate the other four. Document offset-vs-keyset in [`CONCEPTS.md`](../CONCEPTS.md).
- Add zod input validation to `project-import.service.ts` and `project-sync-job.service.ts` — externally-supplied CDM payloads currently cross the service boundary unvalidated.

Security review is blocking: this slice changes what payloads are accepted. Expect the CDM round-trip integration test and the `project-sync-*` e2e scenarios to be the real signal.

### 9 — Coverage

`CacheHandler` coverage moved to slice 4a, where it blocks the refactor. What remains, by lines at risk and blast radius:

1. `repositories/common/` (742 L, inherited by 52 repositories)
2. `rest/routes/` (3,458 L, zero unit tests)
3. `config/env.config.ts` (1,051 L)

## Dependencies / notes

- **This story runs on the v1 manual stacking flow**, not `gh stack`. It was planned and slice 1 opened before the tooling was adopted; restructuring live branches mid-story buys nothing. Branch from the correct base and set PR bases by hand, as the slice table specifies. `gh stack` applies from the next story — see [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking).
- Slices 5–7 rebase on slice 4. Do not start them until dead code is removed.
- Slice 4a hard-blocks slice 5. If 4a slips, slice 5 waits — it does not proceed with tests written after the fact.
- No database migrations, no `@grantjs/schema` codegen, no `apps/web` changes in this story.
- e2e must run through `pnpm test:e2e` from the repo root — never `pnpm --filter grant-api test:e2e` against an unprepared stack.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-08-06. Implementation may begin.
- [ ] Gate 3: Stack PRs merged into trunk (light, with security-full on slices 5 and 8).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
- [ ] Re-run the pass-1 lenses and update [`api.md`](../docs/contributing/code-quality/api.md) with resolved counts
