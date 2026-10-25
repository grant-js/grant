# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `iam-authorization-path`
- **Stack plan**: `plans/2026-10-25-iam-authorization-path-stack.md`
- **Slice branch**: `feat/iam-authorization-path-invalidate`
- **Base branch**: `feat/iam-authorization-path-walk` (prior slice / #608)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## Design

Keep `auth:result:{userId}:{tenant}:{scopeId}:…` (user-first) so per-user prefix delete and DynamoDB trailing-`*` `keys()` stay valid. Tenant invalidation scans `auth:result:*` and deletes only delimiter-anchored matches for this tenant and its child scopes (`org-1:` does not match `org-10`).

`invalidatePermissionsCacheForAllScopes(scope)` no longer calls `cache.permissions.clear()`. Scoped-id sets in the permissions namespace and other tenants' auth results stay. Delete/assign/revoke still invalidate before the next check (#579). No new `@grantjs/core` port. Architect stays off.

An organization write also misses `organizationProject` / `organizationProjectUser` for that org (inherited platform roles). A project write also misses `projectUser` for that projectId.

## In scope

- Tenant-scoped invalidate on `CacheHandler` + callers pass `scope`
- Replace the `store.size === 0` characterization test
- Cascade tests stay ordered-correct without global `clear()`
- Unit pins for org-1 vs org-10 and tenant A vs tenant B

## Out of scope

- Gate 3 merge / story → main
- M2 `getGrantedScopeSlugs`
- Walk / authenticate / RLS / rate-limit / pool product changes
- Rewriting e2e
- Web files
- Redis/Dynamo adapter API change

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run
- [x] PR opened with correct base; links #608 (#610)
- [x] Senior Security notified (`security-full`) — allow; 0 Critical / High / Medium
