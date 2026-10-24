# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-refresh-verified`
- **Base branch**: `feat/api-security-hardening`
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `AuthHandler.refreshSession`: stop passing `undefined` for `isVerified`
- `UserSessionService.refreshSessionByRefreshToken` / `signSession`: mint `isVerified` from the session’s authentication method (`userAuthenticationMethod.isVerified`), same source as login
- Never default the JWT `isVerified` claim to `true`
- Fail closed (`false`) when the method is missing or `isVerified` is not strictly `true`
- Tests: unverified refresh stays false; verified stays true; `mfaVerified` still from `user_sessions.mfaVerifiedAt`
- Patch changeset for `grant-api`

## Out of scope

- Slices 2–17
- Web files (`mfa-step-up-dialog`, `/auth/mfa`, `shouldOpenInAppMfaStepUp`)
- MFA verify / recovery `signSession(..., true, true)` paths
- `user_sessions.email_verified` column / migration
- Docs residuals (slice 17)

## Reference patterns

- Login already copies `userAuthenticationMethod.isVerified` into `signSession` (`AuthHandler.login`)
- MFA refresh already derives `mfaVerified` from `user_sessions.mfaVerifiedAt` (`user-sessions.service.mfa-refresh.test.ts`)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [x] Senior Security notified if `security-full`
