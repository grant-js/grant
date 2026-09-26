---
title: Analytics
description: Optional analytics integrations (e.g. Umami) in Grant
---

# Analytics

This page describes how to add analytics via **integrations** (e.g. [Umami](https://umami.is/), or other backends), so your app can send events without Grant owning the storage or UI. Analytics is optional; enable it by configuring a provider.

## Overview

Analytics is delivered through **integrations** using the port-and-adapter pattern: you plug in an adapter (noop by default, or Umami, etc.). The platform exposes a single `trackEvent` contract; integrations forward events to the backend of your choice. Grant does not store events; adapters send them to external or open-source platforms.

- **Port:** `IAnalyticsAdapter` in `@grantjs/core`; event shape is minimal (name, optional category, properties, optional user/account/org IDs, requestId, timestamp). Grant's own emits use the product-event vocabulary in `product-analytics.ts` (stable names, categories, and a closed property set). No PII in the contract; compliance is the adapter's and deployer's responsibility.
- **Integrations:** Noop (default), Umami (self-hosted, privacy-friendly). Additional integrations can be implemented and registered in the factory.
- **Usage:** The API emits a fixed product-event allowlist (authentication, activation, security, integrations). Request logs stay on the telemetry adapter. Analytics is fire-and-forget and does not affect the mutation.

```bmermaid
flowchart LR
    A[Handlers] --> B[IAnalyticsAdapter]
    B --> C[Noop]
    B --> D[Umami]
    D --> E[Umami Server]
```

## Current implementation

Config is in `ANALYTICS_CONFIG` ([apps/api/src/config/env.config.ts](apps/api/src/config/env.config.ts)); the adapter is created in [apps/api/src/lib/analytics/index.ts](apps/api/src/lib/analytics/index.ts). Use `getAnalyticsAdapter()` from `@/lib/analytics` in handlers; call `trackEvent` fire-and-forget (do not await in the hot path).

### Config

| Variable                     | Default     | Description                                                                           |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `ANALYTICS_ENABLED`          | `false`     | Enable event tracking when provider is not `none`                                     |
| `ANALYTICS_PROVIDER`         | `none`      | `none` or `umami`                                                                     |
| `ANALYTICS_UMAMI_API_URL`    | —           | Umami API base URL (e.g. `https://analytics.example.com` or `https://cloud.umami.is`) |
| `ANALYTICS_UMAMI_WEBSITE_ID` | —           | Website ID from Umami dashboard                                                       |
| `ANALYTICS_UMAMI_HOSTNAME`   | `grant-api` | Hostname sent with each event                                                         |

See `apps/api/.env.example` for all analytics variables.

### Umami payload

The Umami adapter posts each event to `{ANALYTICS_UMAMI_API_URL}/api/send` as a named custom event. The body is:

| Field                             | Value                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `payload.name`                    | Event name                                                                                                             |
| `payload.tag` and `payload.title` | Category, when set                                                                                                     |
| `payload.hostname`                | `ANALYTICS_UMAMI_HOSTNAME` (default `grant-api`)                                                                       |
| `payload.url`                     | Always `/`                                                                                                             |
| `payload.data`                    | `properties`, plus `actorId` (from `userId`), `accountId`, `organizationId`, and `requestId` when those fields are set |
| `payload.id`                      | Unset. Umami treats `id` as a visitor cache key, so a per-request id would count a new visitor on every call           |

The user agent is the fixed string `Grant-API/1.0 (Analytics)`. Umami Overview charts (browsers, countries, referrers, page views) describe that API process. Operators read Grant usage from the Events view, filtered by event name, with breakdowns on `data`.

### Allowlist

Grant emits these names and no others. Properties are enums or opaque ids (`actorId`, `scopeTenant`, `scopeId`, `projectId`). Emails, display names, credential material, webhook URLs, and error text are not included.

| Event                          | Category    | Question                                                           |
| ------------------------------ | ----------- | ------------------------------------------------------------------ |
| `account.registered`           | auth        | How many accounts register, and with which provider?               |
| `session.started`              | auth        | How many interactive console sign-ins create a new session?        |
| `session.failed`               | auth        | Why do console sign-ins fail? (`credentials`, `unverified`, `mfa`) |
| `organization.created`         | activation  | How many accounts reach a first organization?                      |
| `project.created`              | activation  | How many tenants reach a first project?                            |
| `invitation.sent`              | activation  | How often are organization members invited?                        |
| `invitation.accepted`          | activation  | What share of organization invitations are accepted?               |
| `mfa.enrollment_changed`       | security    | Is MFA enrollment rising or falling?                               |
| `password.changed`             | security    | Are passwords being set, changed, or reset?                        |
| `api_key.created`              | security    | Are tenants creating API credentials?                              |
| `api_key.revoked`              | security    | Are API credentials being revoked?                                 |
| `webhook_subscription.created` | integration | Are tenants subscribing to webhooks?                               |
| `project_sync.finished`        | integration | Do CDM sync jobs complete or fail, and for which operation?        |

`session.started` fires when console register or login creates a session. Reusing an existing session, refreshing a session, and project-OAuth sign-in do not emit it. Milestones that already have a domain event (`invitation.*`, `api_key.*`, `mfa.enrollment_changed`, `password.changed`, `project_sync.finished`) are projected after the event-relay transaction commits. Registration, session, organization, project, and webhook events are emitted from the handler after its own transaction commits. A failed login is emitted from the error path and does not include the identifier that was submitted.

Login and registration are not added to the domain-event catalog. They are operator metrics, not tenant webhook facts.

## Best practices

- **Fire-and-forget:** Do not `await` `trackEvent` in the request path; use `.catch(log)` so failures do not break the app.
- **No PII in payloads:** Do not put email, passwords, or other sensitive data in `properties`; compliance is the adapter's and deployer's responsibility.
- **Stable event names:** The allowlist above is the contract. Adapters chart those names; do not invent parallel names for the same action.

## Adding another integration

Implement the `IAnalyticsAdapter` interface from `@grantjs/core` (method `trackEvent`) and register it in the analytics factory. See [@grantjs/analytics](packages/@grantjs/analytics) and the existing Umami adapter ([packages/@grantjs/analytics/src/umami.ts](packages/@grantjs/analytics/src/umami.ts)) as the reference; add a new provider branch in the factory and the corresponding config in `ANALYTICS_CONFIG`.

---

**Related:**

- [Observability overview](/advanced-topics/observability-overview) — Integrations for logging, metrics, telemetry, tracing
- [Umami dashboards](/advanced-topics/umami-dashboards) — Walkthrough to connect Grant to Umami and build a first analytics dashboard
- Runbook: `observability/README.md` in the repo
