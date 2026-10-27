# Permission evaluation benchmarks

Committed summary: **[Benchmark report](./report.md)**.

Key-fanout CDM import first + repeat (batch-apply slice 1) is a different recipe: [Key-fanout CDM import baseline](./cdm-import-key-fanout.md). Replace + hash-prep (follow-on slice 1) is [Key-fanout CDM replace hash-prep](./cdm-import-key-fanout-replace.md). Do not treat this H4 `is-authorized` report as those targets.

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

This bench is `POST /api/auth/is-authorized` (H4). It is not a pool-wait measurement. To watch the H1 parking spot (RLS client held until COMMIT), use the `pg_stat_activity` recipe in [report.md](./report.md#how-to-watch-the-parking-spot-h1). There is no pool-checkout metric today — `http_request_duration_seconds` is HTTP duration only.

Scoped list-page cost vs ID-set size (H3) is a different recipe: [Scoped ID list measure](/contributing/scoped-id-list-measure). Do not treat this report as that target.

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
