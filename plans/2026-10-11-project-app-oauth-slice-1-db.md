# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `project-app-oauth`
- **Stack plan**: `plans/2026-10-11-project-app-oauth-stack.md`
- **Slice branch**: `feat/project-app-oauth-db`
- **Base branch**: `feat/project-app-oauth`
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current worktree

## In scope

- Drizzle table `project_oauth_grants`: `projectAppId`, `userId`, tenant `scopeTenant`/`scopeId`, optional `scopes` JSON, hashed refresh `token`, `expiresAt`, `lastUsedAt`, optional `userAgent`/`ipAddress`, soft-delete
- Audit table `project_oauth_grant_audit_logs` following `project_app_audit_logs`
- Relations from `project_apps` and `users`
- Generated migration via `pnpm --filter @grantjs/database db:generate`
- Env `PROJECT_OAUTH_REFRESH_TOKEN_EXPIRATION_DAYS` (default 30) in `@grantjs/env`, `apps/api` `env.config.ts`, config-app metadata/schemas, `apps/api/.env.example`

## Out of scope

- Handlers, services, repositories, GraphQL, REST, OpenAPI
- Authorization-code cache / PKCE / token endpoint
- Hosted UI / Test OAuth
- Docs (slice 5)
- RLS policies (v1: tenant via `projectAppId` + application scope, same as `project_apps`)
- Any change to `user_sessions` or `JWT_REFRESH_TOKEN_EXPIRATION_DAYS`

## Reference patterns

- `packages/@grantjs/database/src/schemas/user-sessions.schema.ts` (hashed token, expiry, lastUsedAt, soft-delete)
- `packages/@grantjs/database/src/schemas/project-apps.schema.ts` (project-app FK, audit logs)
- `packages/@grantjs/env/src/schema.ts` + `apps/api/src/config/env.config.ts` Project OAuth block

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
