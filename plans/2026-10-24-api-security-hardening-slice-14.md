# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-min-aal`
- **Base branch**: `feat/api-security-hardening-cascade-chunk` (slice 13)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `assertMinAalAtLoginGraphql`: fail closed when `operationName` is null/empty if `AUTH_MIN_AAL_AT_LOGIN=aal2`
- Keep allowlist for `Me`, `VerifyMfa`, `RefreshSession`, recovery (existing `SAFE_AAL1_GRAPHQL_OPERATION_NAMES`)
- REST min-AAL unchanged
- Tests, slice brief, patch changeset for `grant-api`
- Security docs: unnamed GraphQL no longer fails open

## Out of scope

- Slices 15–17
- Changing REST min-AAL paths or GET `/graphql` skip
- Shrinking or expanding the named GraphQL allowlist
- Web files / UX

## Reference patterns

- Existing `apps/api/tests/unit/lib/authorization/min-aal-at-login.test.ts`
- Slice 4 unnamed GraphQL auth-rate-limit resolution (name from document)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#584](https://github.com/grant-js/grant/pull/584), base slice 13 / #583)
- [x] Senior Security notified if `security-full` (review requested on #584; unnamed GraphQL min-AAL)
