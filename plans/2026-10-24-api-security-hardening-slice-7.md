# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-app-scopes`
- **Base branch**: `feat/api-security-hardening-mfa-verify` (slice 6)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `ProjectOAuthHandler.signProjectScopedToken`: refuse to mint `projectApp` when `getGrantedScopeSlugs` is empty (`invalid_scope`)
- `Grant.isAuthorized`: deny when `type === ProjectApp` and `scopes` is missing or empty (today it skips the cap when `length === 0`)
- Apps with no configured scopes still mint `apiKey` (uncapped) — unchanged
- Tests: empty intersection is not signed; missing/empty `scopes` deny without RBAC; matching scopes still check permissions
- Patch changeset for `grant-api`

## Out of scope

- Slices 8–17
- Refresh ∩ current `app.scopes` when the allowlist is cleared (slice 8 / M5)
- Web files / UX
- Changing consent UI when the intersection is empty

## Reference patterns

- Existing `projectApp` cap in `Grant.isAuthorized` (non-empty `grantedScopes`)
- Token endpoint OAuth errors (`invalid_grant`, `invalid_client`)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#577](https://github.com/grant-js/grant/pull/577), base slice 6 / #576)
- [x] Senior Security notified if `security-full`
