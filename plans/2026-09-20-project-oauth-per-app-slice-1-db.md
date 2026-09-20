# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `project-oauth-per-app`
- **Stack plan**: `plans/2026-09-19-project-oauth-per-app-stack.md`
- **Slice branch**: `feat/project-oauth-per-app-db`
- **Base branch**: `feat/project-oauth-per-app`
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current worktree

## In scope

- Drizzle table `project_oauth_connections` (project-grain GitHub/Google BYO credentials, ciphertext columns matching `user_mfa_factors`)
- Audit table `project_oauth_connection_audit_logs` following `project_app_audit_logs`
- Unique `(projectId, provider)` where `deleted_at` is null
- Relations from `projects` and generated migration via `pnpm --filter @grantjs/database db:generate`

## Out of scope

- Handlers, services, repositories, GraphQL, REST, OpenAPI
- Env keys (`PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY`, `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL`) — travel with the API slice
- Encryption helper, schema codegen, web UI
- RLS policies (v1: core table, tenant via `projectId` + application scope, same as `project_apps`)

## Reference patterns

- `packages/@grantjs/database/src/schemas/project-apps.schema.ts` (project FK, soft-delete unique, audit logs)
- `packages/@grantjs/database/src/schemas/user-mfa-factors.schema.ts` (`encrypted_secret`, `secret_iv`, `secret_tag`)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
