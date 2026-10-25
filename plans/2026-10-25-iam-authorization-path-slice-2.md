# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `iam-authorization-path`
- **Stack plan**: `plans/2026-10-25-iam-authorization-path-stack.md`
- **Slice branch**: `feat/iam-authorization-path-walk`
- **Base branch**: `feat/iam-authorization-path-measure` (prior slice / #607)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## Recorded at slice-2 start

- **M2 skip:** `getGrantedScopeSlugs` still loops `getUserPermissions` once per candidate slug. Folding “one walk, many slugs” would drop or relocate the action/resource filter (`getPermissionsByIds`) or add a batched port — either grows this slice past a reviewable walk, or activates Architect. A cheaper miss helps M2; rewriting the loop is not this PR.
- **Slices 2 and 3 stay separate.** Invalidate (`permissions.clear()` blast radius) is a different fail-closed surface and its own security-full pass.
- **No M5 index.** Slice 1 EXPLAIN did not name a missing reverse index as blocking.
- **No new `@grantjs/core` port.** Walk stays behind existing `IGrantService.getUserPermissions`. Architect stays off.

## Design (parallel waves)

Same four permission-source unions. Independent `GrantRepository` calls overlap; dependents still wait.

1. `getUserRoleIdsInScope` || `getDirectGroupIdsForUser` || `getDirectPermissionIdsForUser`
2. `getGroupIdsForRoles` || `getDirectPermissionIdsForRoles` (skipped when `roleIds` is empty)
3. `getPermissionIdsForGroups` (skipped when the group-id union is empty)
4. `getPermissionsByIds` (skipped when the permission-id union is empty)

Empty-role and empty-group skips stay. `tokenType` and project id still flow through as today. Unconditional grant still wins over conditional (unchanged `PermissionChecker`). Project-app empty/missing scopes still fail closed before this method. API-key / project-app still use project roles only (`getUserRoleIdsInScope` + `tokenType`).

## In scope

- Parallelize `GrantService.getUserPermissions` as above
- Unit assertion that a full-source miss does not require the old sequential chain (overlap / wave shape)
- Keep existing grant / permission-checker / account-less / project-app fail-closed tests green
- Slice brief + stack-plan PR column

## Out of scope

- Slice 3 (invalidate)
- M2 `getGrantedScopeSlugs` rewrite
- New `@grantjs/core` port
- `grant.authenticate`, RLS, rate-limit, `DB_POOL_MAX` product changes
- Rewriting e2e (`POST /api/auth/is-authorized` allow/deny stays the contract)
- Web files
- Database schema / migrations
- Re-running `pnpm benchmark:authz` (measure snapshot stays the 2026-10-25 / `85a82b19` row)

## Reference patterns

- Slice 1 observed shape: `docs/benchmarks/report.md` (seven sequential methods)
- Existing unit coverage: `apps/api/tests/unit/services/grant.service.test.ts`

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (grant-api type-check, lint, unit tests for grant.service)
- [x] PR opened with correct base; links stack plan + upstream #607 (#608)
- [x] Senior Security notified (`security-full`) — allow; 0 Critical / High / Medium
