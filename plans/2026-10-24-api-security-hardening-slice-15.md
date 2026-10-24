# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-refresh-reuse`
- **Base branch**: `feat/api-security-hardening-min-aal` (slice 14)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `UserSessionService.refreshSessionByRefreshToken` and `ProjectOAuthGrantService.rotateByRefreshToken`: reuse of a rotated secret revokes the session or grant family
- Persist `previous_token` + `family_id`; CAS rotate so a lost race is treated as reuse
- Tests, slice brief, patch changeset for `grant-api`
- Security docs for refresh reuse revoke

## Out of scope

- Slices 16–17
- JWT denylist / cutting already-issued access tokens (L3)
- Web files / UX
- Hashing platform session refresh tokens (still stored as today)

## Reference patterns

- Existing session refresh (`user-sessions.service.refresh-verified.test.ts`)
- Existing grant rotate (`project-oauth-grants.service.test.ts`)
- `revokeAllForUserInProject` family-style soft-delete + audit

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#585](https://github.com/grant-js/grant/pull/585), base slice 14 / #584)
- [x] Senior Security notified if `security-full` (review requested on #585; refresh-family revoke)
