# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-gql-auth-limit`
- **Base branch**: `feat/api-security-hardening-project-app-rls` (slice 3)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- Apply the auth-sensitive rate-limit bucket (default 20 / 15 min) to GraphQL `login`, `register`, `refreshSession` by operation name
- Same bucket for unnamed documents that are those operations (and those fields under another operation name, so `mutation Foo { login }` cannot skip the limiter)
- REST `AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS` stay as they are
- Tests: named + unnamed GraphQL login hit 429 at the auth max; unrelated GraphQL stays on the global bucket; REST login still shares the bucket
- Patch changeset for `grant-api`

## Out of scope

- Slices 5–17
- Platform password lockout (slice 5)
- GraphQL query cost / `limit` clamp (slice 10)
- Changing REST auth paths or MFA/project-OAuth membership of the bucket
- Web files / UX

## Reference patterns

- `AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS` + `rateLimitMiddleware` (`apps/api/src/middleware/rate-limit.middleware.ts`)
- GraphQL document inspection already used for min-AAL (`getOperationAST` / `parse`)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#574](https://github.com/grant-js/grant/pull/574), base slice 3 / #573)
- [x] Senior Security notified if `security-full`
