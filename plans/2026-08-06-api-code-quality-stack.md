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

### 3 — Lint enforcement

Encode slice 2's rules so they cannot regress:

- `@typescript-eslint/no-floating-promises` (type-aware) — would have caught bug 1.1
- `no-restricted-imports` for the `AGENTS.md` symbol table
- `eslint-plugin-boundaries` or `dependency-cruiser` for the layer DAG — **currently 100% clean**, so this locks in a green state
- `knip` or `ts-prune` in CI

Expect the first full-repo run to surface violations in `apps/web` and `packages/`. Scope the rules to `apps/api` here; widening them belongs to those units' own passes.

### 4 — Dead surface removal

~115 exports, the 2 never-called `CacheHandler` methods, and the duplicate auth-cache invalidator (keep one of `invalidateAuthorizationResultsForUser` / `invalidateAuthorizationCacheForUser`).

Orphaned REST schemas need a decision per group, not bulk deletion: `uploadUserPicture*` has a live GraphQL mutation and no REST route — either wire the route or delete the schemas. Same question for `deleteAccount*`, `changePassword*`, and the session/auth-method sets.

Run `knip` from slice 3 to confirm the list before deleting.

### 4a — `CacheHandler` characterization tests

**Blocks slice 5.** Not optional and not deferrable to slice 9.

`handlers/base/cache-handler.ts` is 888 lines, has no dedicated test file, and decides what entity IDs every caller is allowed to see. Refactoring it without tests risks a cross-tenant data leak — the failure mode e2e suites are least likely to catch, because a leak looks like a successful response.

Characterize **current** behaviour, bugs included. Do not fix anything here:

- All 9 `getScopedXIds` across every `Tenant` variant they handle, including the `Account` cases that intentionally return `[]` and the `default:` `BadRequestError`.
- The `ProjectUser` intersection logic at `:307-324` — the subtlest branch in the file.
- Cache hit vs miss paths: a hit must not call `scopeServices`; a miss must write the computed set back.
- The add/remove wrappers and each `invalidateXCacheForScope` namespace.

These tests are the correctness check for slice 5: write them against the current 9 methods, refactor, and they must pass **untouched**. If a test needs editing to go green, the refactor changed behaviour — stop and review why.

### 5 — `CacheHandler` + scope helpers · security-full

The highest-risk slice. `CacheHandler` decides what every caller may see; a mistake here is a tenancy leak.

- Collapse 9 `getScopedXIds`, 22 add/remove wrappers, and 8 `invalidateXCacheForScope` into a descriptor table plus three generics.
- **Keep every public method name as a one-line delegate** — no handler changes, no test churn, reviewable diff.
- Extract `lib/scope.lib.ts` and replace the 8 inline `.split(':')` sites.
- Fix `invalidateSigningKeysCacheForScope:873` to use `createCacheKey`.

Slice 4a's tests must be green on this branch before the refactor begins, and must still pass unmodified when it ends.

### 6 — Service helpers

- `resolveDelete()` for the delete+audit+event block — 43 services.
- `validatePage()` for the list+`validateOutput` block — 12 services, also removes the discarded allocation.
- `intersectScopedIds()` for the empty-scope early return — 9 handlers.
- Normalize `metadata` vs `auditMetadata`.

Migrate services in batches by domain so each commit stays reviewable. Behaviour must not change: the audit and event payloads are consumed downstream.

### 7 — REST CRUD router factory

`createCrudRouter({ resource, schemas, handler })` for `groups`, `roles`, `permissions`, `tags`, `resources`. Preserve the middleware order exactly: `validate` → `requireEmailThenMfaRest` → `authorizeRestRoute` → handler.

OpenAPI registration must stay in sync — `rest/openapi/` is generated separately from the routes, so verify the emitted spec is byte-identical before and after.

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
