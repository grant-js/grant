---
'grant-api': minor
---

Add an `emf` telemetry provider that writes CloudWatch Embedded Metric Format documents to stdout.

Selected with `TELEMETRY_PROVIDER=emf`; `none` remains the default and the `cloudwatch` provider is unchanged. EMF suits a frozen-container runtime where the existing CloudWatch adapter does not: it needs no SDK, no log-stream sequence token, and nothing flushed before a freeze.

`TELEMETRY_EMF_DIMENSIONS` defaults to `method,statusCode` and deliberately excludes `path` — request paths embed resource IDs, and every distinct dimension combination creates a billable CloudWatch metric. Unbounded fields are still emitted as document properties and stay queryable in Logs Insights.

`/metrics`, the Prometheus middleware, and the ServiceMonitor are untouched; the two paths coexist and are config-selected.
