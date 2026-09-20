# 0008 — Per-project OAuth connections for social sign-in

- **Status**: Accepted
- **Date**: 2026-09-20
- **Context**: story `project-oauth-per-app` (plans `2026-09-19-project-oauth-per-app-*.md`)
- **Related**: [Project OAuth](/core-concepts/project-oauth), [Sign-in providers](/core-concepts/sign-in-providers), ADR [0004](./0004-secret-resolution-through-a-port.md)

## Context

Grant has two OAuth layers that are easy to conflate:

1. **Grant as IdP** — `ProjectApp` records (`clientId`, `redirectUris`, scopes) let a tenant product use Grant's hosted sign-in and receive a project-scoped JWT.
2. **Social IdP** — GitHub and Google OAuth clients that Grant uses when a user picks a social provider.

Before this decision, both platform Grant login and project-app hosted sign-in reused the **same** platform env credentials (`GITHUB_CLIENT_ID`, `GOOGLE_CLIENT_ID`). Every tenant's end users saw Grant's Google/GitHub consent screen, shared Google's verification quota, and depended on one platform secret's blast radius.

`ProjectApp.enabledProviders` only filtered which methods an app offered; it did not supply credentials. Hosted sign-in also consulted `GET /api/auth/providers`, which reflects **platform** configuration — not whether a project had its own client.

## Decision

**Social OAuth for project apps is configured at project grain via BYO connection records. Platform Grant login stays on env vars.**

1. **Grain = project.** One GitHub and one Google connection per Grant project (`project_oauth_connections`). All `ProjectApp` records in that project share the connection. `enabledProviders` remains the per-app subset switch.
2. **Platform login unchanged.** Web login, register, Settings → connect, and CLI OAuth continue to use `GITHUB_*` / `GOOGLE_*` env vars only (`apps/api/src/handlers/oauth.handler.ts`).
3. **BYO with optional platform fallback.** Project authorize/callback resolve credentials in order: project connection → (if `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL` is false) platform env → error. Default: fallback on (`packages/@grantjs/env/src/schema.ts:153`).
4. **Single broker callback.** Customer Google/GitHub apps register **one** redirect URI: Grant's project callback (`GITHUB_PROJECT_CALLBACK_URL` / `GOOGLE_PROJECT_CALLBACK_URL`, default `{APP_URL}/api/auth/project/callback`). Customer SPA URLs stay on `ProjectApp.redirectUris` only — never on the IdP.
5. **Encrypt BYO secrets at rest** with `PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY` (AES-256-GCM + scrypt, distinct KDF salt from `AUTH_MFA_SECRET_ENCRYPTION_KEY`). Persist fails closed when the key is missing (`apps/api/src/lib/project-oauth-connection.lib.ts`).
6. **Platform secrets via ADR 0004; BYO secrets in DB.** Env GitHub/Google secrets still resolve through `ISecretResolver`. Per-project client secrets are ciphertext in Postgres, not Secrets Manager keys per tenant (v1).
7. **Credential source in OAuth state.** Authorize stores `credentialSource: 'byo' | 'platform'` in cache state; callback must reuse the same source (`apps/api/src/handlers/project-oauth.handler.ts:67`). Never store secrets in state.
8. **Public metadata is project-scoped.** `GET /api/auth/project/app-info` returns `configuredProviders` from project connections (+ fallback policy). Hosted sign-in does **not** call `GET /api/auth/providers`.
9. **Authorization.** `Project` Update permission gates upsert/clear connection mutations. Secrets are write-only via API; never returned, audited without secret values, excluded from CDM/GDPR export.
10. **Global user linking unchanged.** `AuthHandler.resolveUserIdFromOAuthForProject` keeps the same algorithm as platform OAuth; Google `sub` and GitHub user id are stable across OAuth clients.

## Why not the alternatives

**One platform Google/GitHub app for all tenants (status quo).** Simple for self-hosted single-tenant, but does not scale as multi-tenant SaaS: wrong brand on IdP consent, shared Google verification cap, and operator temptation to add customer SPA origins to Grant's Google client.

**Per-ProjectApp credentials.** Finer grain than needed for v1; duplicates operator work when several apps share one product. Deferred.

**Per-project callback paths** (e.g. `/api/auth/project/callback/{projectId}`). Not required by Google or GitHub; shared broker callback keeps IdP redirect URI lists minimal.

**Reuse `AUTH_MFA_SECRET_ENCRYPTION_KEY`.** Rejected to isolate rotation blast radius.

**Organization-inherited connections.** Deferred; project grain matches branding and membership boundaries today.

## Consequences

- Operators of **hosted multi-tenant** Grant should plan BYO connections per customer project and may set `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL=true` to disable platform fallback.
- **Self-hosted** deployments can leave fallback enabled and continue using one env-configured GitHub/Google client for both platform login and project apps (migration-compatible).
- Dashboard adds **OAuth connections** under each project (`…/projects/{projectId}/oauth-connections`).
- `IOAuthProviderService` accepts optional `OAuthClientCredentials` overrides so platform and project flows share HTTP/token logic without per-project service singletons.
- Email magic-link project OAuth has no connection row; behavior unchanged.

## References

- Table: `packages/@grantjs/database/src/schemas/project-oauth-connections.schema.ts`
- Service port: `packages/@grantjs/core/src/ports/services/project-oauth-connection.service.port.ts`
- Handler credential resolution: `apps/api/src/handlers/project-oauth.handler.ts`
- Hosted sign-in visibility: `apps/web/lib/project-oauth-entry.lib.ts`
