# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `iam-authorization-path`
- **Stack plan**: `plans/2026-10-25-iam-authorization-path-stack.md`
- **Slice branch**: `feat/iam-authorization-path-measure`
- **Base branch**: `feat/iam-authorization-path`
- **Owner role**: Backend
- **Review bar**: light
- **worktree_path**: current checkout

## In scope

- Copy approved brief + stack into repo `plans/`
- Re-run `pnpm benchmark:authz` against a local API on current `main` / this trunk (post #605)
- Update `docs/benchmarks/report.md` (date, HEAD, catalog size, cold/warm/throughput, pointer to previous snapshot)
- Record observed cold-miss query count/shape (which `GrantRepository` methods, order, wall time)
- Keep published targets: cold p95 &lt; 50 ms, warm p95 &lt; 15 ms
- Existing `scripts/benchmarks/permission-evaluation.mjs` only

## Out of scope

- Slices 2 and 3 (walk, invalidate)
- New k6/Artillery harness
- Invented p95
- Production authorize-path change
- Leaving `SECURITY_ENABLE_RATE_LIMIT=false` as a product change
- Rewriting e2e
- H1/H2/H3 hold (RLS / rate-limit / pool / authenticate product changes)
- Web files
- Patch changeset (docs-only)

## Reference patterns

- Existing `docs/benchmarks/report.md` + `scripts/benchmarks/permission-evaluation.mjs`
- H1 measure slice `#590` (same bench, pre-H2/H3 snapshot)

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (format check; docs-only slice — no API/web/OpenAPI)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full` (not this slice)
