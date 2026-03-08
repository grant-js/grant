---
title: Distributed Tracing
description: End-to-end request tracing with OpenTelemetry in Grant
---

# Distributed Tracing

Grant uses [OpenTelemetry](https://opentelemetry.io/) for distributed tracing. The API is auto-instrumented for HTTP, Express, GraphQL, and Redis; you choose a backend (Jaeger or OTLP) via configuration and can add custom spans for business operations. Bootstrap: `apps/api/src/lib/tracing/index.ts`. Config: `TRACING_CONFIG` in [env.config.ts](https://github.com/logusgraphics/grant-platform/blob/main/apps/api/src/config/env.config.ts).

## What you get

Distributed tracing records a **trace** per request: a tree of **spans** (units of work) with timing and attributes. That gives you:

- **Request timelines** — See where time is spent (middleware, resolvers, DB, cache, external calls).
- **Cross-service correlation** — Same trace ID across logs and downstream services when propagation is enabled.
- **Debugging** — Filter by `user.id`, `error=true`, or duration in your trace backend.

::: details How it's wired
Tracing is initialized at server startup before other services. Request IDs and optional user IDs are set on the active span in [request-logging middleware](https://github.com/logusgraphics/grant-platform/blob/main/apps/api/src/middleware/request-logging.middleware.ts). Redis is instrumented via `@opentelemetry/instrumentation-ioredis`. PostgreSQL is not auto-instrumented (app uses postgres.js). Shutdown runs during graceful server shutdown (`shutdownTracing()` before DB/cache close).
:::

## Request flow example

A trace is a tree of spans over time. Conceptually, one request might look like this:

```bmermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database
    participant Cache as Cache
    participant Ext as External
    C->>+API: Request
    Note over API: Auth (30ms)
    Note over API: Permission check (20ms)
    API->>DB: Query users (25ms)
    DB-->>API: Results
    API->>DB: Query permissions (30ms)
    DB-->>API: Results
    API->>Cache: Lookup (15ms)
    Cache-->>API: Hit
    API->>Ext: Email (20ms)
    Ext-->>API: Sent
    API-->>-C: Response (~150ms total)
```

## Architecture

```bmermaid diagram-narrow
flowchart TD
    A[API Server] --> B[OpenTelemetry SDK]
    B --> C[Auto-instrumentation]
    B --> D[Custom Spans]
    C --> E[HTTP/GraphQL]
    C --> F[Redis]
    D --> H[Business Logic]
    E --> I[Trace Exporter]
    F --> I
    H --> I
    I --> J{Backend}
    J -->|Local| K[Jaeger]
    J -->|OTLP| L[Datadog / New Relic / Honeycomb]
```

## Backends

| Backend    | Use case                | Key config                                  |
| ---------- | ----------------------- | ------------------------------------------- |
| **Jaeger** | Local dev, self-hosted  | `TRACING_BACKEND=jaeger`, `JAEGER_ENDPOINT` |
| **OTLP**   | Cloud / vendor backends | `TRACING_BACKEND=otlp`, `OTLP_ENDPOINT`     |

OTLP is the standard export format; most vendors (Datadog, New Relic, Honeycomb, etc.) accept OTLP. Set `OTLP_ENDPOINT` to your collector or vendor endpoint.

## Configuration

| Variable                | Default                             | Description                                  |
| ----------------------- | ----------------------------------- | -------------------------------------------- |
| `TRACING_ENABLED`       | `false`                             | Enable tracing                               |
| `TRACING_BACKEND`       | `jaeger`                            | `jaeger` or `otlp`                           |
| `JAEGER_ENDPOINT`       | `http://localhost:14268/api/traces` | Jaeger collector (when backend is `jaeger`)  |
| `OTLP_ENDPOINT`         | `http://localhost:4318/v1/traces`   | OTLP endpoint (when backend is `otlp`)       |
| `TRACING_SAMPLING_RATE` | `1.0`                               | Sampling rate `0.0`–`1.0` (e.g. `0.1` = 10%) |
| `TRACING_SERVICE_NAME`  | `grant-api`                         | Service name in traces                       |

Minimal local setup:

```bash
TRACING_ENABLED=true
TRACING_BACKEND=jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

## Custom spans

Add spans for business operations so they show up in the trace tree. Use **active spans** so context propagates.

### Creating a span

```typescript
import { getTracer } from '@/lib/telemetry/tracing';
import { SpanStatusCode } from '@opentelemetry/api';

const tracer = getTracer();

return tracer.startActiveSpan('OrganizationService.createOrganization', async (span) => {
  try {
    span.setAttribute('organization.name', data.name);
    const organization = await this.repository.create(data);
    span.setAttribute('organization.id', organization.id);
    span.setStatus({ code: SpanStatusCode.OK });
    return organization;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
});
```

::: tip
Use `startActiveSpan`, not `startSpan`, so the span is attached to the current trace context. Get the tracer once (e.g. in the service constructor) via `getTracer()` from `@/lib/telemetry/tracing`.
:::

### Useful attributes

| Context       | Example attributes                       |
| ------------- | ---------------------------------------- |
| User / tenant | `user.id`, `user.accountId`, `tenant.id` |
| Domain        | `organization.id`, `project.id`          |
| Operation     | `operation.type`, `operation.entity`     |
| Counts        | `records.count`, `batch.size`            |

### Nested spans

Create child spans for sub-operations so the trace shows a clear hierarchy:

```typescript
return this.tracer.startActiveSpan('processImport', async (parentSpan) => {
  try {
    const records = await this.tracer.startActiveSpan('parseCSV', async (span) => {
      const result = await parseCSV(data.file);
      span.setAttribute('records.count', result.length);
      span.end();
      return result;
    });
    // ... validateRecords, insertRecords as separate startActiveSpan calls
    parentSpan.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    parentSpan.recordException(error);
    parentSpan.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    parentSpan.end();
  }
});
```

## Local development with Jaeger

Run Jaeger (all-in-one) with OTLP enabled:

```bash
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 -p 14268:14268 -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

| Port    | Purpose                 |
| ------- | ----------------------- |
| `16686` | Jaeger UI               |
| `14268` | Jaeger collector (HTTP) |
| `4318`  | OTLP HTTP               |

Open [http://localhost:16686](http://localhost:16686), select service `grant-api`, and run "Find Traces".

## Cloud / vendor backends (OTLP)

Use `TRACING_BACKEND=otlp` and set `OTLP_ENDPOINT` (and any API key env your vendor needs). No extra packages required for standard OTLP HTTP.

| Vendor        | Endpoint (typical)                        | Notes                        |
| ------------- | ----------------------------------------- | ---------------------------- |
| **Datadog**   | `http://localhost:8126` or agent OTLP     | Set `DD_API_KEY` if required |
| **New Relic** | `https://otlp.nr-data.net:4318/v1/traces` | Set `NEW_RELIC_API_KEY`      |
| **Honeycomb** | `https://api.honeycomb.io/v1/traces`      | Set `HONEYCOMB_API_KEY`      |

Refer to each vendor’s docs for exact endpoint and headers.

## Best practices

- **Add business context** — `tenant.id`, `user.id`, `organization.id` so you can filter traces by customer or feature.
- **Record errors** — In `catch`, call `span.recordException(error)` and `span.setStatus({ code: SpanStatusCode.ERROR, message })`.
- **Sample in production** — Set `TRACING_SAMPLING_RATE=0.1` (or 0.2–0.5) to limit cost and overhead.
- **Keep spans focused** — One span per logical operation; use child spans for sub-steps, not one span around a long loop.

## Querying traces (Jaeger UI)

| Goal          | Steps                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Slow requests | Service `grant-api` → Min duration e.g. `500ms` → Find Traces                            |
| Errors        | Service `grant-api` → Tag `error=true` → Find Traces                                     |
| By user       | Service `grant-api` → Tag `http.user_id=<id>` (or `user.id` if you set it) → Find Traces |

## Performance

| Aspect  | Typical impact                      |
| ------- | ----------------------------------- |
| CPU     | &lt; 5%                             |
| Memory  | &lt; 50 MB                          |
| Latency | &lt; 1 ms per span                  |
| Network | Batched exports (e.g. 5 s interval) |

Use sampling and limit attributes per span in high-traffic environments.

## Troubleshooting

| Issue             | What to check                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| No traces         | `TRACING_ENABLED=true`; correct `JAEGER_ENDPOINT` or `OTLP_ENDPOINT`; logs for "tracing" / "OpenTelemetry" errors |
| High overhead     | Lower `TRACING_SAMPLING_RATE`; ensure noisy instrumentations (e.g. fs, dns) are disabled in bootstrap             |
| Span not in trace | Use `startActiveSpan` (not `startSpan`) so the span is attached to the current context                            |

---

**Related:**

- [Observability Overview](/advanced-topics/observability-overview) — Logging, metrics, telemetry, tracing
- [Metrics](/advanced-topics/metrics) — Prometheus metrics and dashboards
- [Configuration](/getting-started/configuration) — All environment variables

**References:**

- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)
- [Jaeger](https://www.jaegertracing.io/docs/)
