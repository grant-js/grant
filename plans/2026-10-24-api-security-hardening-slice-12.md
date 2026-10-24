# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-tenant-lists`
- **Base branch**: `feat/api-security-hardening-org-members` (slice 11)
- **Owner role**: Backend
- **Review bar**: light
- **worktree_path**: current checkout

## In scope

- `UsersHandler.getUsers`: load `project_users` only for the page’s user ids when merging project metadata / profile
- `ProjectUserRepository.getProjectUsers` / service / ports: optional `userIds` batch filter (empty list is empty, not the whole project)
- Authorization still uses the scoped-id cache; do not change who is visible
- Tests, slice brief, patch changeset for `grant-api`

## Out of scope

- Slices 13–17
- Rewriting `CacheHandler` scoped-id cache population (still loads full tenant membership for authorization)
- Paging `users` via a `project_users` join (sort/search stay on the user list)
- IAM cascade chunking (slice 13 / M10)
- Web files / UX

## Reference patterns

- Slice 11 org-member page-then-batch-hydrate
- `PivotRepository.queryIntersection` / `queryByFieldValues`
- Existing `users.handler.list-hydration.test.ts`

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
