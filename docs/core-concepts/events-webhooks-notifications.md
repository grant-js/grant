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

Some types exist for webhook consumers only: `user.created`, `user.updated`, `user.deleted`, `project.user_updated`, `api_key.deleted`, `tag.created`, `tag.updated`, `tag.deleted`, `tag.linked` and `tag.unlinked`. They are `transactional` with an **empty audience**, so the notification generator resolves nobody for them and never creates an inbox row or an email. Everything else in this list still tells someone.

Coverage includes IAM CRUD/assignments, API key lifecycle, CDM sync summaries, **membership lifecycle** (organization invitations, org members, project users), and **security lifecycle** (signing keys, MFA enable/disable/recovery codes, session revoke, password changed). Password-reset **request** remains email-only (`sendPasswordReset`); only completed password changes emit `user.password_changed`.

## Publishing

Services inject `IEventPublisher` and call `publish` after a successful mutation:

- **Create** → `{ after }`
- **Update** → `{ before, after, delta }`
- **Delete / revoke** → `{ before }`

Payloads include ids and display-friendly fields for renderers. Never put secrets, hashes, or raw tokens in `data` (webhook delivery also redacts sensitive keys as a second line of defense).

User-facing assign/revoke events set `subjectUserId` so the notification audience can include the affected user.

### Cascades: ending a pivot always emits its revoke

A state-based consumer keeps a copy of who holds what and diffs it on every event, so an access that ends **without** an event leaves its copy wrong forever. Deleting an entity therefore emits, in the same transaction and before the entity goes, the same revoke a direct revoke would, one per pivot, each with `subjectUserId` where a user is the subject:

| Delete of                                   | Also emits, per pivot                                                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Group**                                   | `user.group_revoked` (per member), `role.group_revoked` (per linked role), `group.permission_revoked` (per permission)                                    |
| **Role**                                    | `user.role_revoked` (per holder), `role.permission_revoked`, `role.group_revoked`                                                                         |
| **Permission**                              | `user.permission_revoked`, `group.permission_revoked`, `role.permission_revoked`                                                                          |
| **Tag**                                     | `tag.unlinked` (per user, group, role, permission or resource it was on)                                                                                  |
| **Project member** (`project.user_removed`) | `user.role_revoked` (the user's roles that belong to the project), `user.group_revoked` and `user.permission_revoked` (what the project granted the user) |

Two of these were silent before. Deleting a group removed its permissions and role links through the pivot services but left its **members**: a soft delete does not cascade to `user_groups`, so the memberships stayed active and pointed at a deleted group, and a hard delete removed them through the foreign key without an event. The group delete now removes each membership through `UserGroupService`, which publishes the revoke. Removing a project member used to delete only the `project_users` row; the user's project roles, groups and direct permissions stayed active. They are now revoked first, which also matches what the organization-member removal already did for roles.

**Volume: no cap.** A group with several hundred members produces several hundred `user.group_revoked` events in one transaction. Each goes through the pivot service (an existence check, the soft delete, the audit row, the project-link read and the outbox insert), so the cost is linear and a large delete is slower, not wrong. A cap was rejected because a consumer that diffs state needs to know _which_ users were affected, and an event the cap dropped is a user whose access it never learns ended. The parent `*.deleted` event is not a substitute: its external `data` has no member list. If a delete ever becomes too slow, the fix is a batched `publishMany` on the outbox insert, not dropping events.

### Lifecycle events and what they carry

- **`user.created` / `user.updated` / `user.deleted`** describe the platform identity. `subjectUserId` is the user. They carry ids and timestamps only: `user.updated` lists the **names** of the fields that changed (`changedFields`), never their values, and an update that changed nothing emits nothing. The delete event stores no name, because the outbox row outlives a hard delete, which is an erasure. They are emitted from `UserService`, so self-deletion and account deletion are covered, once per deletion: the data-retention job's later hard delete of a user who was already soft-deleted finds no live user (the user lookup excludes soft-deleted rows, as before this change) and emits nothing. A change to `picturePath` alone is not reported, because the user model does not carry it. `user.deleted` carries `after.hardDelete`. The event is written **before** the delete because `event_log.subject_user_id` references `users.id`; a hard delete then nulls it, so `grantsubjectuser` is `null` for a hard delete while `subject` and `data.after.id` still name the user. A user reaches a project's subscription when the request ran in that project or the user was already a member when the event was published (`user.deleted` reads the memberships before the delete); `user.created` for a user who joins a project afterwards is announced by `project.user_added`.
- **`project.user_updated`** is the project-member counterpart of `project.user_profile_updated` for the one change that event does not cover: the member's `metadata`. A project member has no status column, so nothing else changes on that row. CDM imports merge importer metadata without emitting (entity events are suppressed during import).
- **`api_key.deleted`** names the owning user as `subjectUserId` **only** when the key has exactly one owner in `project_user_api_keys`. Account and organization-project keys have no owning user, and the `userId` of an API-key token exchange falls back to the key's own id for them, so it is never used here. The project links are read before the delete.
- **`tag.created` / `tag.updated` / `tag.deleted`** have the tag as aggregate and reach the projects the tag is linked to (`project_tags`). **`tag.linked` / `tag.unlinked`** have the **pivot** (`userTag`, `groupTag`, `roleTag`, `permissionTag`, `resourceTag`) as aggregate. Unlike other revokes they carry the ids in `data.after` for both types, `{ tagId, targetKind, targetId }`, because the envelope drops `before` and a tag pivot has no subject user to say what it joined. `subjectUserId` is set only when the target is a user. A tag pivot reaches the tag's projects and the target's (role, group, permission, resource); a user target adds none.

Redaction is unchanged: these payloads hold ids, a tag's name and colour, and the project member's metadata that `project.user_added` already exposes. No email, no user name.

### Relay latency vs durability

After a successful outbox insert, request-scoped publishers schedule a coalesced **`event-relay`** BullMQ job via `scheduleAfterCommit` so consumers run soon after commit. The scheduled **`event-relay-sweep`** job remains the durability guarantee if enqueue is lost or jobs are disabled. Background/`createAppContext` publishes without the hook rely on the sweep alone.

### Integrator quirks (membership)

- Accepting an organization invitation emits **two** events in one transaction: `organization.member_added` (membership write) then `organization.invitation_accepted` (invitation status transition). Filter by type if you only want one.
- `organization.member_removed` can originate from admin remove (`OrganizationMemberService`) or cleanup paths (`OrganizationUserService`); both write sites emit the same type, never both in one call chain.

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

Subscriptions are **project-scoped**. Each delivery POSTs JSON and includes:

| Header              | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| `Content-Type`      | `application/json`                                     |
| `Webhook-Id`        | Delivery / event correlation id                        |
| `Webhook-Timestamp` | Unix seconds used in the signed string                 |
| `Webhook-Signature` | `v1,<base64 hmac-sha256>` of `"{timestamp}.{rawBody}"` |

### Which events reach a subscription

A subscription receives every event that is **relevant to its project**, whatever scope the request that caused it ran in (organization, account, project, project-app user or the system). An event is relevant to a project when:

- the request ran in a scope that names the project (`accountProject`, `organizationProject`, the `…ProjectUser` forms, and `projectUser` for a project-app end user's own requests); or
- the event is about a **role, group, permission, resource, tag or API key that is linked to the project**, or about a user's assignment to one (`user.role_assigned`, `role.group_revoked`, `tag.linked`, …). The link is read when the event is published, so editing a project's role from an organization dashboard, or assigning a project role during sign-up, reaches the project's subscriptions.

One entity can be linked to several projects (a shared permission, for instance); the event then reaches every one of them. An entity linked to an organization or account but to no project is not relevant to any project: nothing is delivered and nothing fails. Events about a user's own security (`user.mfa_*`, `user.password_changed`, `user.session_revoked`) reach a project only when the request ran in that project's scope, because a user is not linked to a project through a pivot. The user lifecycle events are the exception: they name the projects the user is a member of themselves (see above).

The envelope is the same for every case: `grantscope` is the scope the request ran in, so an event delivered because of a linked entity can show an organization scope.

### External envelope

Bodies follow CloudEvents 1.0 with Grant extensions:

```json
{
  "specversion": "1.0",
  "id": "…",
  "source": "https://your-grant-host",
  "type": "user.role_revoked",
  "time": "2026-01-01T00:00:00.000Z",
  "subject": "userRole/…",
  "grantsequence": "42",
  "grantscope": { "tenant": "organizationProject", "id": "orgId:projectId" },
  "grantactor": { "userId": "…" },
  "grantsubjectuser": { "userId": "…" },
  "grantcategory": "iam",
  "data": {}
}
```

External `data` drops internal `before` snapshots and redacts keys matching secret/token patterns (replaced with `"[redacted]"`).

`grantactor` is the user who made the change; `grantsubjectuser` is the user the event is about, for events that have one (for example `user.role_revoked`, `user.group_revoked`, `project.user_removed`, `organization.member_removed`). Both are `null` when absent. Because `before` is dropped, `grantsubjectuser` is how a consumer learns whose access was revoked or removed; `subject` is the id of the changed record (such as the role assignment), not the user.

Delivery is **best-effort / at-least-once** with application-level retries (escalating delays, then dead). Grant does not guarantee per-subscription delivery ordering; endpoints should be **idempotent** on `id` / `Webhook-Id`. SSRF guards block private targets unless explicitly allowed in configuration (useful for local receivers).

For local dogfooding, `node scripts/webhook-receiver.mjs` listens on `http://localhost:5000/webhooks/grant` and appends NDJSON. With Docker/local API, enable HTTP and private targets via the webhook SSRF env flags when needed.

Operators manage subscriptions via the dashboard (**Project → Webhooks**) or the API (REST `/api/webhook-subscriptions` and GraphQL `webhookSubscriptions` / `createWebhookSubscription` / …). See [Transport Layers](/api-reference/transport-layers) and Swagger UI for the full surface.

## Notifications

The notification generator:

1. Loads the catalog `audienceRule` for the event type.
2. Resolves primitives to user ids (`subject`, `scopeMembers`, `owners`, `roleHolders`, …).
3. Applies per-scope preferences (category × in-app / email). Security/`transactional` rows stay on where policy requires.
4. Upserts idempotent notification rows and optionally enqueues email.

Users see the **notification center** and **preferences** in the dashboard; the header bell shows unread counts. In-app copy is rendered from event type + display context (actor, scope, named entities, subject vs observer) — not from raw webhook envelopes.

Email-channel rows are composed **at send time** from `event_log` + the same display context, using Grant’s MJML chrome (header, structured details, View in Grant, preferences footer). Copy lives in `@grantjs/i18n` `email.notification.*` (en + de). `organization.invitation_sent` does not enqueue email — the dedicated invitation template already goes out.

**Audience notes:** `owners` and `roleHolders` resolve to org/account administrative roles as implemented by the audience resolver. The `watchers` primitive remains reserved for a future subscribe / follow model: it currently contributes no recipients, is not a user preference, and catalog `audienceRule`s do **not** list `watchers` until that model exists.

Inbox and preference management are available under `/api/me/notifications*` (REST) and GraphQL `myNotifications` / `myNotificationPreferences` / … (authenticated me lane).

## Adding a new event type

Follow this order so catalog, emit, and UI stay aligned:

1. **Catalog** — add the type and `EVENT_CATALOG` entry in `packages/@grantjs/schema/src/events/event-catalog.ts`; rebuild `@grantjs/schema`.
2. **Publish** — inject `IEventPublisher` if needed; call `events.publish` immediately after the audit call in the mutating service method.
3. **Renderer** — add a title/body mapping in `apps/api/src/lib/notifications/notification-renderer.ts`. _Webhook-only type: skip this, and give the catalog entry an empty audience (`webhookOnly(category)`) so no notification is ever generated._
4. **Email family** — map the type in `apps/api/src/lib/notifications/notification-email-families.ts` and add `email.notification.*` strings in `@grantjs/i18n` `locales/en/email.json` and `de/email.json`. _Webhook-only type: map it to `'webhookOnly'`, no strings._
5. **i18n (web)** — add `webhooks.events.types.<aggregate>.<verb>` labels in `apps/web/i18n/locales/en.json` and `de.json` so webhook pickers show a human name.
6. **Tests** — extend catalog coverage (emitted set), email-family coverage, and add a spot unit test with a mocked publisher when the path is non-trivial.

Prefer small batches of related types over one-off string literals. A new type about a project-linked entity needs no routing code: the publisher derives the projects from the aggregate kind (`event-project-links.lib.ts`). A new **delete** must read the links first with `events.resolveLinkedProjectIds` and pass them as `projectIds`, and a delete that removes pivots must remove them through the pivot services so each emits its revoke.

## Related

- [CDM Import & Export](/core-concepts/cdm-import-export) — import suppression and sync job summaries
- [API Keys](/core-concepts/api-keys) — credential lifecycle (create / rotate / revoke events)
- [Audit Logging](/advanced-topics/audit-logging) — per-entity compliance trail
- [Job Scheduling](/advanced-topics/job-scheduling) — relay and delivery workers
- [Email Service](/advanced-topics/email-service) — email channel adapter used by notifications
