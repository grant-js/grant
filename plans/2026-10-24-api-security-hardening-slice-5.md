# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-platform-lockout`
- **Base branch**: `feat/api-security-hardening-gql-auth-limit` (slice 4)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `AuthHandler.login` Email path: record-before-verify via `CredentialLockoutService`, out of the request transaction, keyed by the resolved user id
- Reuse `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` / `AUTH_LOCKOUT_DURATION_MINUTES` and the same budget rule as project-app password
- Unknown email keeps the existing “method not found” and does not invent a lockout key from the typed address
- Social OAuth login is not counted
- Update `docs/architecture/security.md` (drop “Platform (console) login does not enforce them yet”)
- Tests: lock after N failures, success clears, unknown email not keyed by address, social OAuth untouched
- Patch changeset for `grant-api`

## Out of scope

- Slices 6–17
- MFA verify attempt budget (slice 6 / M3)
- Web files / UX
- Changing project-app password lockout
- Unifying the unknown-email error with “Invalid credentials”

## Reference patterns

- `ProjectOAuthHandler.signInWithProjectPassword` record-before-verify + `passwordAttemptWithinBudget`
- `CredentialLockoutService` / `credentialSignInLockouts` (omit caller tx so platform uses `platformConnection`)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#575](https://github.com/grant-js/grant/pull/575), base slice 4 / #574)
- [x] Senior Security notified if `security-full`
