# Alteos RBAC benchmarks

Run against a local or staging API with Alteos project data loaded:

```bash
pnpm benchmark:rbac -- --base-url http://localhost:4000
```

Optional env:

- `GRANT_API_BASE_URL` — API base URL
- `GRANT_BENCHMARK_CREDENTIALS` — path to API key credentials JSON

Results are written to `docs/benchmarks/alteos-rbac-{date}.json` and `.md` (local-only; not committed — see root `.gitignore`).

Compare **GetRoles (nested)** vs **GetRolesList (slim)** after list view optimizations.

## Reading the report

| Column                    | Meaning                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| **p50 / p95 / min / max** | Latency (ms) over all runs for that query                                 |
| **bytes**                 | Response size from the **last** run                                       |
| **errors**                | GraphQL error count from the **last** run (`0` = clean)                   |
| **ok**                    | `yes` only when the **last** run had HTTP 2xx **and** zero GraphQL errors |

Success targets (Phase 2):

- p95 < 500ms for list queries
- **ok = yes** (no GraphQL errors)

If **ok** is `no` but latency looks fast (~single-digit ms), the request likely failed validation or auth before doing real work — check the **Errors** section at the bottom of the markdown report (or `lastErrorMessage` in the JSON).
