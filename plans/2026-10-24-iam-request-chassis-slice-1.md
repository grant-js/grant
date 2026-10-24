# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `iam-request-chassis`
- **Stack plan**: `plans/2026-10-24-iam-request-chassis-stack.md`
- **Slice branch**: `feat/iam-request-chassis-measure`
- **Base branch**: `feat/iam-request-chassis`
- **Owner role**: Backend
- **Review bar**: light
- **worktree_path**: current checkout

## In scope

- Copy approved brief + stack (and the diagnosis / visual they link) into repo `plans/`
- Re-run `pnpm benchmark:authz` against a local API on current `main` / this trunk
- Update `docs/benchmarks/report.md` (date, SHA, environment, results)
- Keep published targets: cold p95 &lt; 50 ms, warm p95 &lt; 15 ms
- State that this bench is `POST /api/auth/is-authorized` (H4), not pool wait
- Docs-only “how to watch the parking spot” recipe (`pg_stat_activity` / existing `http_request_duration_seconds` named as HTTP-only)

## Out of scope

- Slice 2 hold / RLS client-back-at-COMMIT
- Web files
- New metrics platform
- Invented H1 p95 targets
- Raising `DB_POOL_MAX` or setting `SECURITY_ENABLE_RLS=false` as a fix

## Reference patterns

- Existing `docs/benchmarks/report.md` + `scripts/benchmarks/permission-evaluation.mjs`
- `apps/api/src/middleware/context.middleware.ts` (today’s hold — described, not changed)

## Done when

- [x] Implementation complete within this slice only
- [ ] Verifier run (docs / format)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full` (not this slice)
