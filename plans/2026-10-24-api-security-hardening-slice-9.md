# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-cache-delete`
- **Base branch**: `feat/api-security-hardening-oauth-refresh` (slice 8)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `RoleHandler.deleteRole` / `GroupHandler.deleteGroup` / `PermissionHandler.deletePermission`: after cascade, call `invalidatePermissionsCacheForAllScopes` (same as assign/revoke)
- Always clear, including when the deleted entity has no remaining relations
- Tests: group delete cascade asserts `cache.permissions.clear`; matching role and permission delete tests
- Patch changeset for `grant-api`

## Out of scope

- Slices 10–17
- Chunking IAM cascade / outbox (slice 13 / M10)
- Per-user targeted invalidation (whole-namespace clear is the existing assign/revoke contract)
- Web files / UX

## Reference patterns

- Assign/revoke already call `invalidatePermissionsCacheForAllScopes` (`roles.handler`, `groups.handler`, `users.handler`)
- `CacheHandler.invalidatePermissionsCacheForAllScopes` → `cache.permissions.clear()`
- Existing `groups.handler.delete-cascade.test.ts`

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [x] Senior Security notified if `security-full` (PR body security-full section)
