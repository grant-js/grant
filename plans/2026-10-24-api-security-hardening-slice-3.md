# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-project-app-rls`
- **Base branch**: `feat/api-security-hardening-project-app-bind` (slice 2)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- Enable RLS on `public.project_apps` with the sibling project policy: restrictive SELECT on `project_id = app.current_project_id` (unset setting stays open), plus permissive `tenant_rls_allow`
- Same policy on `public.project_oauth_connections` (related OAuth table with `project_id` and the same hole)
- Migration via `pnpm --filter @grantjs/database db:generate`
- Schema tests that the policies match `project_resources`
- Note the coverage in `docs/architecture/security.md`
- Patch changeset for `grant-api`

## Out of scope

- Slices 4–17
- Handler / repository bind changes (slice 2)
- RLS on `project_app_tags` / `project_oauth_grants` (no `project_id`; cannot use the same policy)
- Audit tables
- Web files / UX
- FORCE ROW LEVEL SECURITY (not used on sibling pivots)

## Reference patterns

- `project_resources` / `project_password_resets` / `project_user_credentials` policies
- Migration `0089_project_password_resets.sql`

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#573](https://github.com/grant-js/grant/pull/573), base slice 2 / #571)
- [x] Senior Security notified if `security-full`
