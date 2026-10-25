# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `iam-scoped-id-lists`
- **Stack plan**: `plans/2026-10-25-iam-scoped-id-lists-stack.md`
- **Slice branch**: `feat/iam-scoped-id-lists-page`
- **Base branch**: `feat/iam-scoped-id-lists-measure`
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: same checkout as the story trunk

## In scope

- Page scoped lists (users, groups, roles, permissions, tags, projects, resources, api-keys) with search / tagIds / explicit ids / sort / page / limit applied in SQL against a pivot subquery before hydrating objects.
- `EntityRepository.query` accepts `accessibleIdSource` (`IN (SELECT …)` or `'empty'`) plus extra conditions. A 50-row page must not bind the full accessible ID array.
- `PivotRepository.query` applies `ORDER BY created_at` + `LIMIT`/`OFFSET` when the caller asks for a page.
- Tenant isolation stays fail-closed. Cache still stores the full scoped-id set for mutations (`getScoped*Ids` unchanged).
- Search, tags, and explicit ids match the full accessible set in the same SQL (slice 3 skipped).

## Out of scope

- New GraphQL `filters` API
- New `IScopedIdProvider` paged method / Architect
- H1/H2, H4, skipping authenticate, disabling rate limit, raising `DB_POOL_MAX`, turning off RLS
- Offset → keyset
- Merging slice 1 (#602) or targeting `main`

## Reference patterns

- CacheHandler tenant maps (`cache-handler.scoped-ids.test.ts`)
- Organization member SQL page (M9)
- Users list hydration (`users.handler.list-hydration.test.ts`)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
