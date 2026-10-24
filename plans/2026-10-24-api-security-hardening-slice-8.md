# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-oauth-refresh`
- **Base branch**: `feat/api-security-hardening-app-scopes` (slice 7)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `ProjectOAuthHandler.exchangeRefreshToken`: always intersect `grant.scopes` with current `app.scopes`
- Empty `app.scopes` ⇒ no OAuth scopes (do not keep the stored grant; do not escalate to uncapped `apiKey` when the grant had slugs)
- Empty intersection shares slice 7 fail-closed (`invalid_scope`, grant revoked)
- Apps that never configured scopes (grant and app both empty) still refresh as `apiKey`
- Tests: shrink to current allowlist; cleared allowlist refuses; no overlap refuses
- Patch changeset for `grant-api`

## Out of scope

- Slices 9–17
- Changing authorization-code mint for apps with no scopes (still `apiKey`)
- Web files / UX
- Authz cache invalidation on delete (slice 9 / M6)

## Reference patterns

- Slice 7 `signProjectScopedToken` empty-intersection `invalid_scope`
- Existing refresh rotate + revoke-on-failure in `exchangeRefreshToken`

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
