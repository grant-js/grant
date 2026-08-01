---
title: Events, Webhooks & Notifications
description: Domain-event outbox, signed project webhooks, and preference-aware in-app notifications
---

# Events, Webhooks & Notifications

Grant records **domain events** as the shared backbone for external automation and in-app alerts. Services publish events in the same transaction as the data change and audit log. A durable **outbox** (`event_log`) then fans out to two independent consumers:

| Consumer          | Purpose                                                                               |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Webhooks**      | POST a signed, redacted CloudEvents payload to project subscription URLs              |
| **Notifications** | Resolve an audience, apply preferences, and create in-app (and optionally email) rows |

```bmermaid
flowchart TB
  svc["Service mutation"] --> tx["Same DB transaction"]
  tx --> data["Entity change"]
  tx --> audit["Audit log"]
  tx --> pub["IEventPublisher"]
  pub --> log[("event_log outbox")]
  log --> relay["Relay / sweep"]
  relay --> wh["Webhook dispatcher"]
  relay --> ng["Notification generator"]
  wh --> http["Signed HTTP POST"]
  ng --> inbox["In-app + email channels"]
```

Audit logs remain the per-entity compliance trail. Domain events are the integration contract — do not treat audit tables as a webhook feed.

## Catalog

Every emitible type lives in `@grantjs/schema` (`EVENT_TYPES` / `EVENT_CATALOG`). Each entry declares:

| Field             | Meaning                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **type**          | Stable string such as `role.updated` or `api_key.rotated`                                |
| **category**      | `security` \| `iam` \| `membership` \| `integrations` (drives notification preferences)  |
| **deliveryClass** | `notification` (preference-governed) or `transactional` (always deliver; used sparingly) |
| **audienceRule**  | Primitives unioned to build recipient candidates (`subject`, `owners`, `roleHolders`, …) |

A unit coverage test scans service sources for `events.publish({ type: '…' })` and asserts every emitted type is registered. New mutations should co-locate publish with the existing audit call.

Coverage includes IAM CRUD/assignments, API key lifecycle, CDM sync summaries, and **membership lifecycle** (organization invitations, org members, project users).

## Publishing

Services inject `IEventPublisher` and call `publish` after a successful mutation:

- **Create** → `{ after }`
- **Update** → `{ before, after, delta }`
- **Delete / revoke** → `{ before }`

Payloads include ids and display-friendly fields for renderers. Never put secrets, hashes, or raw tokens in `data` (webhook delivery also redacts sensitive keys as a second line of defense).

User-facing assign/revoke events set `subjectUserId` so the notification audience can include the affected user.

## CDM import suppression

Bulk CDM import mutates many entities. Those entity-level events are **suppressed** for the duration of `importProjectCdm` (including replace teardown) via `runWithEventSuppression`, so imports do not flood webhooks or inboxes.

When the async sync job finishes, Grant emits a single summary:

- `project_sync.completed`
- `project_sync.failed`

See [CDM Import & Export](/core-concepts/cdm-import-export) for the import/export job model. Export-only jobs also emit the same completed/failed summaries; entity events are not involved.

## Webhooks

Project operators manage subscriptions under **Project → Webhooks**:

1. Create a subscription (HTTPS URL, description, event type filters).
2. Store the **signing secret** shown once at creation (or after rotate).
3. Inspect deliveries and replay failed attempts from the subscription detail page.

Subscriptions are **project-scoped** today. Each delivery POSTs JSON and includes:

| Header              | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| `Content-Type`      | `application/json`                                     |
| `Webhook-Id`        | Delivery / event correlation id                        |
| `Webhook-Timestamp` | Unix seconds used in the signed string                 |
| `Webhook-Signature` | `v1,<base64 hmac-sha256>` of `"{timestamp}.{rawBody}"` |

### External envelope

Bodies follow CloudEvents 1.0 with Grant extensions:

```json
{
  "specversion": "1.0",
  "id": "…",
  "source": "https://your-grant-host",
  "type": "role.updated",
  "time": "2026-01-01T00:00:00.000Z",
  "subject": "role/…",
  "grantsequence": "42",
  "grantscope": { "tenant": "organizationProject", "id": "orgId:projectId" },
  "grantactor": { "userId": "…" },
  "grantcategory": "iam",
  "data": {
    "after": { "id": "…", "name": "Developer" },
    "delta": { "name": { "from": "Dev", "to": "Developer" } }
  }
}
```

External `data` drops internal `before` snapshots and redacts keys matching secret/token patterns (replaced with `"[redacted]"`).

Delivery is at-least-once with application-level retries (escalating delays, then dead). Endpoints should be **idempotent** on `id` / `Webhook-Id`. SSRF guards block private targets unless explicitly allowed in configuration (useful for local receivers).

For local dogfooding, `node scripts/webhook-receiver.mjs` listens on `http://localhost:5000/webhooks/grant` and appends NDJSON. With Docker/local API, enable HTTP and private targets via the webhook SSRF env flags when needed.

## Notifications

The notification generator:

1. Loads the catalog `audienceRule` for the event type.
2. Resolves primitives to user ids (`subject`, `scopeMembers`, `owners`, `roleHolders`, …).
3. Applies per-scope preferences (category × in-app / email). Security/`transactional` rows stay on where policy requires.
4. Upserts idempotent notification rows and optionally enqueues email.

Users see the **notification center** and **preferences** in the dashboard; the header bell shows unread counts. Copy is rendered from event type + display context (actor, scope, entity names) — not from raw webhook envelopes.

**Audience notes:** `owners` and `roleHolders` resolve to org/account administrative roles as implemented by the audience resolver. `watchers` is reserved in the catalog for a future subscribe model and currently contributes no recipients.

## Adding a new event type

Follow this order so catalog, emit, and UI stay aligned:

1. **Catalog** — add the type and `EVENT_CATALOG` entry in `packages/@grantjs/schema/src/events/event-catalog.ts`; rebuild `@grantjs/schema`.
2. **Publish** — inject `IEventPublisher` if needed; call `events.publish` immediately after the audit call in the mutating service method.
3. **Renderer** — add a title/body mapping in `apps/api/src/lib/notifications/notification-renderer.ts`.
4. **i18n** — add `webhooks.events.types.<aggregate>.<verb>` labels in `apps/web/i18n/locales/en.json` and `de.json` so webhook pickers show a human name.
5. **Tests** — extend catalog coverage (emitted set) and add a spot unit test with a mocked publisher when the path is non-trivial.

Prefer small batches of related types over one-off string literals. Skip high-volume, low-signal pivots (for example most tag attachments) unless a concrete subscriber needs them.

## Related

- [CDM Import & Export](/core-concepts/cdm-import-export) — import suppression and sync job summaries
- [API Keys](/core-concepts/api-keys) — credential lifecycle (create / rotate / revoke events)
- [Audit Logging](/advanced-topics/audit-logging) — per-entity compliance trail
- [Job Scheduling](/advanced-topics/job-scheduling) — relay and delivery workers
- [Email Service](/advanced-topics/email-service) — email channel adapter used by notifications
