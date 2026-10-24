# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `iam-request-chassis`
- **Stack plan**: `plans/2026-10-24-iam-request-chassis-stack.md`
- **Slice branch**: `feat/iam-request-chassis-hold`
- **Base branch**: `feat/iam-request-chassis-measure` (PR #590)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- Return the scoped RLS request-transaction client to the pool at COMMIT
- After-commit (`scheduleAfterCommit`) must run on `db` / `durableDb`, not the request client, and must not keep that client checked out
- Keep `SET LOCAL ROLE` + tenant GUCs around every scoped query; `SECURITY_ENABLE_RLS` stays default true
- Keep `holdResponseEndUntil` so Lambda enqueue is awaited and a failed COMMIT is not flushed as success
- Tests: commit-then-after-commit order; after-commit not on the request client; SET LOCAL still applied
- `docs/advanced-topics/transactions.md` + security RLS lifecycle note
- Patch changeset on `grant-api`

## Out of scope

- Rewrite of slice 1 / PR #590
- Web files
- Raising `DB_POOL_MAX` or setting `SECURITY_ENABLE_RLS=false`
- H2–H4 work
- Trunk → `main` PR
- Dropping after-commit on the response path without a documented durable alternative

## Reference patterns

- `apps/api/src/middleware/context.middleware.ts`
- `apps/api/src/lib/after-commit.lib.ts`
- Existing after-commit middleware tests (order + commit-fail + Lambda hold)

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run (format, lint, unit tests for after-commit / middleware)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified (`security-full`)
