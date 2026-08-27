---
'grant-api': patch
---

Add `TRACING_SPAN_PROCESSOR` to select how OpenTelemetry spans are exported.

`batch` (default) buffers spans and exports them on a timer, which is unchanged
behavior for the long-running server. `simple` exports each span as it ends.

Use `simple` on any runtime that can freeze or terminate the process between
requests — AWS Lambda behind the Web Adapter, for instance — where a buffered batch
is not delayed but lost, and the spans lost are disproportionately those of the
slowest requests.

Only applies when `TRACING_ENABLED=true`.
