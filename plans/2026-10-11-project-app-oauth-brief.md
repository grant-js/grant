# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Stack: [2026-10-11-project-app-oauth-stack.md](./2026-10-11-project-app-oauth-stack.md). In-repo domain docs: `docs/core-concepts/project-oauth.md`. Prior research: Grant Project store `internal/project-oauth-refresh-complexity-estimate.md`.

## Metadata

- **Slug**: `project-app-oauth`
- **Date**: 2026-10-11
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro
- **Status**: approved — Gate 1 passed 2026-10-11 by Alejandro

## Objective

Project apps stop receiving an access JWT in the URL fragment (implicit). Hosted sign-in and Test OAuth become a standard authorization-code + PKCE flow: consent returns a one-time `code`, and `POST /api/auth/project/token` exchanges it (and later a rotating `refresh_token`) for a project-scoped access JWT. Discovery documents are published per RFC 8414 with a twin OpenID configuration URL. Grant remains the authorization server for ProjectApp clients; it is not a full OpenID Provider.

## Acceptance criteria

- [ ] **Authorize** accepts `response_type=code` and PKCE (`code_challenge`, `code_challenge_method=S256`). Shared `GET /api/auth/project/authorize` (not a per-project authorize URL).
- [ ] **Consent approve** redirects to `redirect_uri?code=…&state=` (query). The fragment implicit handoff (`#access_token=`) is removed — no dual mode.
- [ ] **`POST /api/auth/project/token`** supports `grant_type=authorization_code` (`code`, `code_verifier`, `redirect_uri`, `client_id`) and `grant_type=refresh_token` with rotation. Confidential apps send `client_secret`. Public apps use PKCE only.
- [ ] Token endpoint does **not** accept `client_credentials`, does **not** issue `id_token`, and does **not** implement DPoP. It is **not** `POST /api/auth/refresh` and does **not** write `user_sessions`.
- [ ] Refresh secrets persist in `project_oauth_grants` (hashed), with TTL from `PROJECT_OAUTH_REFRESH_TOKEN_EXPIRATION_DAYS` (not `JWT_REFRESH_TOKEN_EXPIRATION_DAYS`). Access JWT `jti` is the grant id. Refresh re-checks membership and recomputes granted scopes.
- [ ] Per-project `iss` and `jwks_uri` stay the existing project JWKS issuers. Metadata: RFC 8414 well-known is inserted **before** the issuer path, plus a twin `{iss}/.well-known/openid-configuration` that returns the **same JSON** (not an OP).
- [ ] Hosted pages and dashboard **Test OAuth** use PKCE + code exchange. OpenAPI stays in sync.
- [ ] Docs and e2e cover the new flow. Publishable change is a **minor BREAKING** changeset (not major).

## Non-goals

- DPoP / sender-constrained tokens
- `id_token` / UserInfo / a real OpenID Provider
- `client_credentials` on `/api/auth/project/token`
- Reusing `user_sessions` or `POST /api/auth/refresh`
- Grant HttpOnly refresh cookies on tenant `redirect_uri` origins
- Dual-mode implicit fragment compatibility window
- Admin “revoke app grants” GraphQL UI (store enables it; UI is follow-on)
- Changing social BYO connections, branding, or membership/`allowSignUp`

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [x] GDPR export / deletion / PII
- [ ] None of the above

**Why each is checked**

- **Auth / sessions / MFA / AAL:** new authorization-code + refresh credential class for project apps. Must not enter the platform session/MFA pipeline. Project-app tokens stay non-interactive.
- **API keys / tokens:** rotating refresh secrets, `client_secret` verification, PKCE binding. Wrong client must not mint tokens.
- **Tenancy / RLS / org scoping:** grants are project-app + user scoped; refresh must not cross projects. `iss` / JWKS stay per-project.
- **Permissions / RBAC:** refresh recomputes scope intersection; role changes must shrink access.
- **GDPR / PII:** grant rows (and hashed refresh secrets) must be deleted with the user; secrets stay out of export.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior Frontend, Senior QA, Senior Security, Verifier.

## Human gate

- [x] Gate 1: Story brief approved — 2026-10-11 by Alejandro.
