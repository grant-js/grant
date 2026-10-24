# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-gql-cost`
- **Base branch**: `feat/api-security-hardening-cache-delete` (slice 9)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- Apollo `validationRules` in `apps/api/src/create-app.ts`: depth + complexity (keep `specifiedRules`)
- `EntityRepository.query`: clamp `limit` to `PAGINATION_MAX_PAGE_SIZE`; cap public `-1`
- Internal complete-set loads keep `-1` via `unbounded` (MFA, JWKS, hydration, scope-cache, GDPR export)
- REST schemas that already cap at 100 stay
- Tests, slice brief, patch changeset for `grant-api`

## Out of scope

- Slices 11–17
- Org member SQL paging (slice 11) and tenant-list materialization (slice 12)
- Changing REST OpenAPI copy that still mentions `-1`
- Web files / UX

## Reference patterns

- Slice 4 GraphQL AST walk in `graphql-auth-rate-limit.lib.ts`
- `hasNextPageByCount` / notifications page clamp
- Existing `PAGINATION_MAX_PAGE_SIZE` (default 100)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#580](https://github.com/grant-js/grant/pull/580), base slice 9 / #579)
- [x] Senior Security notified if `security-full` (PR body security-full section)
