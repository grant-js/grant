# Permission evaluation benchmarks

Committed summary: **[Benchmark report](./report.md)**.

Measures `POST /api/auth/is-authorized` (cold vs warm cache, allow vs deny, throughput) against a running Grant API:

```bash
pnpm benchmark:authz -- --base-url http://localhost:4000
# alias: pnpm benchmark:rbac
```

Optional env:

- `GRANT_API_BASE_URL` — API base URL
- `GRANT_BENCHMARK_CREDENTIALS` — path to API key credentials JSON

Optional CLI:

- `--runs 20` — iterations per cold/warm check
- `--throughput 30` — total cold checks in the throughput phase (`0` to skip)
- `--concurrency 3` — max in-flight requests during throughput

Raw results are written to `docs/benchmarks/authz-{date}.json` and `.md` (local-only; not committed — see root `.gitignore`). Update [report.md](./report.md) when publishing a new snapshot.

Credentials JSON may include a `checks` array to customize permission cases (`name`, `permission.resource` / `permission.action`, `expectAuthorized`).

## Reading the report

| Column                           | Meaning                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| **mode**                         | `cold` (cache-busted), `warm` (AuthHandler cache hit), or `throughput`               |
| **p50 / p95 / min / max / mean** | Latency (ms) over runs for that check                                                |
| **authorized / reason**          | Last-run authorization outcome from the API                                          |
| **ok**                           | `yes` when HTTP succeeded **and** `authorized` matched `expectAuthorized` (when set) |
| **checks/s**                     | Throughput phase only — completed cold checks per second                             |

Success targets:

- Cold p95 &lt; 50ms
- Warm p95 &lt; 15ms
- Expected allow/deny outcomes match
- **ok = yes** (no HTTP errors)

If **ok** is `no` but latency looks fast (~single-digit ms), the request likely failed validation or auth before doing real work — check the **Errors** section in the markdown dump (or `lastErrorMessage` in the JSON).
