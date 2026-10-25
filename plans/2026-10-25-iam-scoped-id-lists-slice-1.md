# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `iam-scoped-id-lists`
- **Stack plan**: `plans/2026-10-25-iam-scoped-id-lists-stack.md`
- **Slice branch**: `feat/iam-scoped-id-lists-measure`
- **Base branch**: `feat/iam-scoped-id-lists`
- **Owner role**: Backend
- **Review bar**: light
- **worktree_path**: current checkout

## In scope

- Copy approved brief + stack into repo `plans/`
- PE pick at slice start: recipe home is `docs/contributing/scoped-id-list-measure.md` (not `docs/benchmarks/report.md`)
- Write the recipe: one scoped users list page (default 50) against a 1k-id set and a 10k-id set on current `main`
- Record query shape / `IN` length / `count(*)` / page row count / wall time as observed
- Docs + existing unit/integration only
- Pointer from `docs/benchmarks/README.md` so H4 is not mistaken for this target

## Out of scope

- Slices 2 and 3 (filter+sort+page, search/tag/ids)
- New k6/Artillery harness
- Invented H3 p95 or pass/fail target
- Changing list/SQL behavior
- Skipping `grant.authenticate`, disabling rate limit, raising `DB_POOL_MAX`, turning off RLS
- Web files
- Patch changeset (docs-only; versioning.md says no changeset unless releasing platform)

## Reference patterns

- `apps/api/tests/integration/credentials.postgres.integration.test.ts` (`GRANT_TEST_DATABASE_URL`)
- `apps/api/tests/unit/handlers/users.handler.project-pivot-page.test.ts` (stubbed scoped ids)
- `docs/benchmarks/report.md` — H4 only; do not treat as H3 target
- H1 measure slice `#590` (recipe + observed run, no invented H1 p95)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (format check; docs-only slice — no API/web/OpenAPI)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full` (not this slice)
