---
title: Umami Dashboards
description: Step-by-step walkthrough to connect Grant to Umami and build your first analytics dashboard
---

# Umami Dashboards

Reproducible steps to send events from the Grant API to Umami and view them in a dashboard. Same idea as [Grafana dashboards](/advanced-topics/grafana-dashboards) for performance metrics.

## Prerequisites

- API that can be configured with `ANALYTICS_ENABLED=true`, `ANALYTICS_PROVIDER=umami`, and Umami URL + Website ID.
- Umami running (Docker via Grant's compose, or [Umami Cloud](https://umami.is/)).

## 1. Run Umami (if self-hosted)

From the repo root:

```bash
docker compose up -d umami
```

Umami will be at http://localhost:3002 (or the port configured in `docker-compose.yml`). It uses its own database; first start may take a moment. Alternatively, use [Umami's official Docker setup](https://umami.is/docs/running-with-docker) or Umami Cloud.

## 2. Get Website ID and API URL

1. Open Umami (e.g. http://localhost:3002). Log in (default `admin` / `umami`; change on first login).
2. Go to **Websites** (or **Settings** → **Websites**). Add a website if needed (e.g. name "Grant API", domain `grant-api` or your hostname).
3. Copy the **Website ID** (UUID) and note the **API URL**: your Umami base URL (e.g. `http://localhost:3002` or `https://cloud.umami.is`).

## 3. Configure the API

Set environment variables and restart the API:

| Variable                     | Example                 | Description                         |
| ---------------------------- | ----------------------- | ----------------------------------- |
| `ANALYTICS_ENABLED`          | `true`                  | Enable analytics                    |
| `ANALYTICS_PROVIDER`         | `umami`                 | Use Umami adapter                   |
| `ANALYTICS_UMAMI_API_URL`    | `http://localhost:3002` | Umami base URL (or Umami Cloud URL) |
| `ANALYTICS_UMAMI_WEBSITE_ID` | `<uuid-from-step-2>`    | Website ID from Umami               |
| `ANALYTICS_UMAMI_HOSTNAME`   | `grant-api`             | Hostname sent with each event       |

If the API runs in Docker on the same network as Umami, use the service name for the URL (e.g. `http://umami:3000`). If the API runs on the host, use `http://localhost:3002`.

## 4. Produce events from Grant

With the provider set to `umami`, the API emits the product-event allowlist on its own. See [Analytics](/advanced-topics/analytics) for the names and properties. Trigger a few console actions: register, log in with a bad password, create an organization, accept an invitation, finish a project sync. Events show up in Umami after a short delay.

These are server-side custom events. The adapter sends a fixed user agent and the URL `/`, and it does not set Umami's visitor id. The Overview page (browsers, countries, referrers, page views) describes the API process. Read usage from the **Events** view.

## 5. Create a dashboard in Umami

1. In Umami, open **Websites** and select the Grant API website.
2. Open **Events** and filter by event name. Break down on the event data (`provider`, `reason`, `result`, `operation`).
3. Four charts cover the first questions an operator asks:
   - `account.registered` by `provider`
   - `session.failed` by `reason`
   - `invitation.sent` compared with `invitation.accepted`
   - `project_sync.finished` by `result`

## 6. Save and iterate

Save the dashboard. New product events belong on the allowlist in [Analytics](/advanced-topics/analytics), not as one-off names in a handler.

---

**Related:**

- [Analytics](/advanced-topics/analytics) — Integrations, config, usage
- [Observability overview](/advanced-topics/observability-overview) — Logging, metrics, telemetry, tracing
- Runbook: `observability/README.md` in the repo
