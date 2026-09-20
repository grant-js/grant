# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `project-oauth-per-app`
- **Stack plan**: `plans/2026-09-19-project-oauth-per-app-stack.md`
- **Slice branch**: `feat/project-oauth-per-app-schema`
- **Base branch**: `feat/project-oauth-per-app-db`
- **Owner role**: Backend
- **Review bar**: light (Architect: public types must not leak secrets)
- **worktree_path**: current worktree

## In scope

- GraphQL type `ProjectOAuthConnection` (`provider`, `clientId`, `isConfigured`, timestamps) — **no secret**
- Mutations `upsertProjectOAuthConnection` (clientId + write-only secret) and `clearProjectOAuthConnection`
- Query `projectOAuthConnections(scope)` (project scope via `Scope`)
- `configuredProviders` on REST `ProjectAppPublicInfo`
- Operation documents for web hooks
- `pnpm --filter @grantjs/schema generate`

## Out of scope

- Runtime OAuth, handlers, resolvers, REST/OpenAPI, UI, encrypt helpers
- Core port implementations (`IProjectOAuthConnectionService` lands with the API slice; codegen does not need stubs)
- Env keys, encryption, credential resolution

## Reference patterns

- `packages/@grantjs/schema/src/schema/webhooks/` (project-scoped list + write-once secret)
- `packages/@grantjs/schema/src/schema/signing-keys/` (scope-only list query)
- `packages/@grantjs/schema/src/project-oauth.types.ts`

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [x] Architect: public types leak no secrets
