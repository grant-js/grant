# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-mfa-verify`
- **Base branch**: `feat/api-security-hardening-platform-lockout` (slice 5)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- Wire `AUTH_MFA_VERIFY_MAX_ATTEMPTS` / `AUTH_MFA_VERIFY_WINDOW_MINUTES` on `UserMfaService.verifyTotp` and `verifyRecoveryCode` (platform and project both call this service)
- Per-user rolling window, record-before-verify, stored in cache (survives the request transaction)
- TOTP and recovery share one budget per user
- Update `docs/architecture/security.md` so the knobs are no longer “when wired”
- Tests: lock after N failures, success clears, shared TOTP/recovery window, window expiry, no factor does not spend
- Patch changeset for `grant-api`

## Out of scope

- Slices 7–17
- Web files / UX
- Changing project-app password lockout / `PROJECT_PASSWORD_MFA_MAX_ATTEMPTS`
- New MFA database tables
- Per-session (rather than per-user) keys

## Reference patterns

- `CredentialLockoutService` record-before-verify (count includes this attempt; Nth is last allowed)
- Cache TTL + timestamp prune for the rolling window (`ICacheAdapter` via `cache.rateLimit`)

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
