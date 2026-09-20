# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `project-oauth-per-app`
- **Stack plan**: `plans/2026-09-19-project-oauth-per-app-stack.md`
- **Slice branch**: `feat/project-oauth-per-app-api`
- **Base branch**: `feat/project-oauth-per-app-schema`
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current worktree

## In scope

- `IProjectOAuthConnectionService` + repository ports and implementations
- Encrypt helper (MFA AES-256-GCM + scrypt, **new KDF salt**; `PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY`)
- GraphQL resolvers + REST/OpenAPI twins for upsert/clear/list
- `createRepositories` / `createServices` / `createHandlers` wiring
- `ProjectOAuthHandler` credential resolver (BYO vs platform fallback)
- Widen `IOAuthProviderService` with optional client credentials (no second HTTP client)
- Hosted authorize/callback use the same credential source (no mixing BYO `client_id` with platform secret)
- `configuredProviders` on project app-info
- Unit + integration tests for handler/service
- Audit allowlist (client id + provider; never secret/ciphertext)
- Hard-delete ciphertext on clear
- Env keys: `PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY`, `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL`

## Out of scope

- Next.js pages / hooks / i18n (slice 4)
- Remaining e2e scenarios (slice 5)
- In-repo docs + ADR (slice 6)
- Merging #465 or #466

## Reference patterns

- `apps/api/src/lib/mfa.lib.ts` (encrypt; different salt)
- `apps/api/src/services/api-keys.service.ts` (audit allowlist)
- `apps/api/src/handlers/webhook-subscriptions.handler.ts` (project-scoped CRUD)
- `apps/api/src/services/github-oauth.service.ts` / `google-oauth.service.ts`

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs
- [x] Senior Security notified (`security-full`) — review bar on [#468](https://github.com/grant-js/grant/pull/468); independent of author
