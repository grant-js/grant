# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-project-app-bind`
- **Base branch**: `feat/api-security-hardening-refresh-verified` (slice 1)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `ProjectAppsHandler.updateProjectApp` / `deleteProjectApp`: require `existing.projectId ===` scoped project (shared `assertProjectAppBelongsToScope`, same message as picture helpers)
- `ProjectAppRepository.updateProjectApp` / `softDeleteProjectApp`: persist with `{ id, projectId }` (`and(eq(id), eq(projectId), isNull(deletedAt))`), not `{ id }` only
- Resolver still authorizes the request-scope project; the load/mutate must match `app.projectId`
- Tests: cross-project id is not-found / forbidden; same-project update/delete still works
- Patch changeset for `grant-api`

## Out of scope

- Slices 3–17
- RLS on `project_apps` (slice 3)
- Web files / UX
- Picture persist bind (`setProjectAppPicture` still updates by id after the handler scope check)
- REST/OpenAPI contract changes

## Reference patterns

- Picture helpers already bound `projectAppId` to the scoped project (`assertProjectAppPictureScope`)
- Service update/delete already require `projectId` in their zod schemas

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [x] Senior Security notified if `security-full`
