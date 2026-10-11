# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `project-app-oauth`
- **Stack plan**: `plans/2026-10-11-project-app-oauth-stack.md`
- **Slice branch**: `feat/project-app-oauth-api`
- **Base branch**: `feat/project-app-oauth-db`
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current worktree

## In scope

- PKCE S256 required on authorize (`response_type=code`, `code_challenge`, `code_challenge_method=S256`)
- Consent approve returns `redirect_uri?code=&state=` (query). Remove fragment implicit (`#access_token=`). Deny uses query `error=access_denied`.
- Authorization codes in cache (`oauth:project-code:{code}`), TTL `PROJECT_OAUTH_AUTHORIZATION_CODE_TTL_SECONDS` (default 60)
- `POST /api/auth/project/token`: `authorization_code` + rotating `refresh_token`; confidential apps require `client_secret`; public apps PKCE only
- Persist SHA-256 hex of refresh secret in `project_oauth_grants.token` (lookup by hash — not bcrypt, not plaintext)
- Access JWT `jti` = grant id; refresh recomputes membership + granted scopes
- Port + repo + service; wire composition root; OpenAPI; auth-sensitive rate limit
- Update existing unit/integration/e2e that would fail (CI includes e2e)

## Out of scope

- RFC 8414 / openid-configuration (slice 3)
- Hosted UI / Test OAuth PKCE helpers except what CI needs (slice 4)
- Docs + changeset (slice 5)
- `user_sessions`, `POST /api/auth/refresh`, DPoP, `id_token`, `client_credentials`

## Reference patterns

- `UserSessionService.refreshSessionByRefreshToken` (rotation only — do **not** store plaintext)
- `ApiKeyService.exchangeApiKeyForToken` (`verifySecret` for confidential clients)
- `hashSecret` / `verifySecret` for `clientSecretHash` only

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run
- [ ] PR opened with correct base
- [ ] Senior Security notified
