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

Some types exist for webhook consumers only: `user.created`, `user.updated`, `user.deleted`, `project.user_updated`, `project.user_email_changed`, `project.user_password_set`, `api_key.deleted`, `tag.created`, `tag.updated`, `tag.deleted`, `tag.linked` and `tag.unlinked`. They are `transactional` with an **empty audience**, so the notification generator resolves nobody for them and never creates an inbox row or an email. Everything else in this list still tells someone.

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

**Volume: no dropped events.** A group with several hundred members still produces several hundred `user.group_revoked` events in one transaction — one per subject. A cap was rejected because a consumer that diffs state needs to know _which_ users were affected, and an event the cap dropped is a user whose access it never learns ended. The parent `*.deleted` event is not a substitute: its external `data` has no member list. Teardown and outbox inserts run in chunks of `IAM_CASCADE_CHUNK_SIZE` (default 50) via `publishMany`, so the transaction and relay stay bounded without collapsing events. The same chunking applies to role and permission deletes.

### Lifecycle events and what they carry

- **`user.created` / `user.updated` / `user.deleted`** describe the platform identity. `subjectUserId` is the user. They carry ids and timestamps only (`user.deleted` also names the import keys of the user in `data.before.externalKeys`, see [External keys of a removed user](#external-keys-of-a-removed-user); when the person deleted themselves, Grant also records a [deletion tombstone](./cdm-import-export.md#deletion-tombstones) per project so the next CDM import does not recreate the identity): `user.updated` lists the **names** of the fields that changed (`changedFields`), never their values, and an update that changed nothing emits nothing. The delete event stores no name, because the outbox row outlives a hard delete, which is an erasure. They are emitted from `UserService`, so self-deletion and account deletion are covered, once per deletion: the data-retention job's later hard delete of a user who was already soft-deleted finds no live user (the user lookup excludes soft-deleted rows, as before this change) and emits nothing. A change to `picturePath` alone is not reported, because the user model does not carry it. `user.deleted` carries `after.hardDelete`. The event is written **before** the delete because `event_log.subject_user_id` references `users.id`; a hard delete then nulls it, so `grantsubjectuser` is `null` for a hard delete while `subject` and `data.after.id` still name the user. A user reaches a project's subscription when the request ran in that project or the user was already a member when the event was published (`user.updated` and `user.deleted` read the memberships when they are emitted, `user.deleted` before the delete); `user.created` normally names no project, and a user who joins a project afterwards is announced by `project.user_added`.
- **`project.user_updated`** is the project-member counterpart of `project.user_profile_updated` for the one change that event does not cover: the member's `metadata`. A project member has no status column, so nothing else changes on that row. CDM imports merge importer metadata without emitting (entity events are suppressed during import).
- **`project.user_email_changed`** is the operator set-email event. `subjectUserId` is the project member. `data.after` carries **ids only**: `projectId`, `userId`, and `operation` (`added` or `changed`). Never the address. Emitted only when the stored normalized Email `providerId` changes. Same address is a no-op (no write, no event). The address is also omitted from the webhook envelope and from structured logs. When `operation` is `changed`, the **previous** address is also told by e-mail, sent directly after the transaction commits and outside the notification system (which resolves recipients by user id, and the id now points at the new address): a notice that an administrator changed the sign-in e-mail, with no link and without the new address. A failed send is logged and never fails the mutation.
- **`project.user_password_set`** is published whenever a project password credential's stored hash changes through a **non-import** write: an operator (`source: admin-set`, `setProjectUserPassword`), a self-service reset (`reset`), or a future `change`. `subjectUserId` is the project member and the aggregate is the member's `projectUser` row. `data.after` carries **ids and the credential source only**: `{ projectId, userId, source }`. Never a password or a hash, and no key whose name contains `password`, `hash` or `secret`, so webhook redaction has nothing to blank. It is published from `CredentialService.write`, the one emission point, with a **change-only** rule: no event when the new hash equals the stored one. Setting the same password twice still publishes twice (each write produces a new bcrypt hash). **A CDM import publishes nothing**, like every other import write (entity events are suppressed during import): a mirror learns import-side password changes from the import's completion event with its counters (ADR 0011 § 8) and, where it holds the export permission, from the credential fingerprint. A credential an operator set (`admin-set`) is never replaced by an import. Platform-scope password changes are unchanged (`user.password_changed`).
- **`api_key.created` / `api_key.rotated` / `api_key.revoked` / `api_key.deleted`** name the key's owning user as `subjectUserId` (the envelope's `grantsubjectuser`) **only** when the key has exactly one owner in `project_user_api_keys`; revoke, rotate and delete read it through one shared resolver, and create is handed the owner by the handler. Account and organization-project keys have no owning user, and the `userId` of an API-key token exchange falls back to the key's own id for them, so it is never used here. The events also name the projects the key is linked to (for a create, the owner's project), so they reach the owning project's subscriptions: `projectIds` is internal fan-out and is never part of the external envelope. `data.before` and `data.after` carry no user and never a secret, even for a key whose project keeps an [exportable copy](./api-keys.md#exportable-secrets-opt-in): the events say which key changed, and the audited credential export is the only path that returns its secret. A delete reads the links before it runs, since a hard delete removes them. A revoke or rotate leaves the links in place. A create has no link yet when it is published, so the handler passes the project user it is about to link into the service, which names them on the event; the publish stays before the link is written, and that order is not observable, because events are an outbox written in the request's transaction and relayed after commit (see [Relay latency vs durability](#relay-latency-vs-durability)).
- **`tag.created` / `tag.updated` / `tag.deleted`** have the tag as aggregate and reach the projects the tag is linked to (`project_tags`). **`tag.linked` / `tag.unlinked`** have the **pivot** (`userTag`, `groupTag`, `roleTag`, `permissionTag`, `resourceTag`) as aggregate. Unlike other revokes they carry the ids in `data.after` for both types, `{ tagId, targetKind, targetId }`, because a tag pivot has no subject user to say what it joined. These two types publish no `before`: they predate the identity-only `data.before` (see [External envelope](#external-envelope)), and the ids stay in `data.after` for compatibility. `subjectUserId` is set only when the target is a user. A tag pivot reaches the tag's projects and the target's (role, group, permission, resource); a user target adds none.

Redaction of `after` and `delta` is unchanged: these payloads hold ids, a tag's name and colour, and the project member's metadata that `project.user_added` already exposes. No email, no user name.

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

One entity can be linked to several projects (a shared permission, for instance); the event then reaches every one of them. An entity linked to an organization or account but to no project is not relevant to any project: nothing is delivered and nothing fails. Events about a user's own security (`user.mfa_*`, `user.password_changed`, `user.session_revoked`) reach a project only when the request ran in that project's scope, because a user is not linked to a project through a pivot. The user lifecycle events are the exception: `user.updated` and `user.deleted` name the projects the user is a member of themselves (see above); `user.created` normally names none, because a new user has not joined a project yet (a later join is `project.user_added`).

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
  "data": {
    "before": { "id": "…", "userId": "…", "roleId": "…", "roleName": "…" }
  }
}
```

External `data` has up to three parts:

- **`after`** and **`delta`** are the internal snapshot and field changes, with every key matching a secret/token pattern replaced by `"[redacted]"`.
- **`before`** is an **identity-only** projection of the internal `before` snapshot (plus `externalKeys` on two events, described below), present on delete, revoke and remove events (and on update events whose snapshot has an identity field). It says _what_ was deleted or revoked, so a subscriber can render "role Editor was deleted" or "role `…` was revoked from user `…`" without looking the record up (a deleted record can no longer be looked up). It is omitted when the snapshot has no identity field.

The projection copies these keys, and only these, and only when the value is a string, number, boolean or `null`:

| Keys                                                                                                                    | Meaning                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `id`, `name`, `slug`, `kind`, `type`                                                                                    | Identity of the entity (or pivot row) the event is about                     |
| `userId`, `roleId`, `groupId`, `permissionId`, `tagId`, `apiKeyId`, `resourceId`, `targetKind`, `targetId`, `projectId` | The other side of a pivot (membership, grant, assignment)                    |
| `roleName`, `groupName`, `permissionName`, `tagName`                                                                    | Name of an access object on the other side of a pivot, when the event has it |

`name` is not carried for events about a user (the `user` aggregate and the `user.*` and `project.user_*` types), because there it could be a person's name; the id and `grantsubjectuser` identify the person. Everything else in the snapshot is dropped: email and other profile fields, descriptions, metadata, timestamps, status flags, and any nested object or array. A key that matches a redaction pattern is replaced by `"[redacted]"` (`apiKeyId` is the one allowlisted key that matches a pattern, `apikey`, and it is an id, so it is exempt). What each type carries today:

| Event                                                                | `data.before`                                                                                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `role.deleted`, `group.deleted`, `permission.deleted`, `tag.deleted` | `id`, `name`                                                                                                                                                                         |
| `resource.deleted`                                                   | `id`, `name`, `slug`                                                                                                                                                                 |
| `api_key.deleted`, `api_key.rotated`                                 | `id`, `name`                                                                                                                                                                         |
| `api_key.revoked`                                                    | `id`                                                                                                                                                                                 |
| `user.deleted`                                                       | `id`, `externalKeys` (see below)                                                                                                                                                     |
| `user.role_revoked`                                                  | `id`, `userId`, `roleId`, `roleName`                                                                                                                                                 |
| `user.group_revoked`                                                 | `id`, `userId`, `groupId`                                                                                                                                                            |
| `user.permission_revoked`                                            | `id`, `userId`, `permissionId`                                                                                                                                                       |
| `role.group_revoked`                                                 | `id`, `roleId`, `groupId`                                                                                                                                                            |
| `role.permission_revoked`                                            | `id`, `roleId`, `permissionId`                                                                                                                                                       |
| `group.permission_revoked`                                           | `id`, `groupId`, `permissionId`                                                                                                                                                      |
| `project.user_removed`                                               | `id`, `projectId`, `userId`, `externalKeys` (see below)                                                                                                                              |
| `organization.member_removed`                                        | `id`, `userId`, or `userId`, `roleId` when removed through the member endpoint                                                                                                       |
| `organization.invitation_revoked`                                    | `id`, `roleId` (the invited email is not carried in `before`, it remains on `data.after` for invitation events; `grantsubjectuser` names the invited user when they have an account) |
| `user.session_revoked`                                               | `id`, `userId`                                                                                                                                                                       |

#### External keys of a removed user

A receiver that mirrors Grant into another system has to name the user a removal or deletion concerns after Grant has forgotten them. `user.deleted` and `project.user_removed` therefore carry one more key in `data.before`, **`externalKeys`**: the key your import attached to the user, as a list of `{ projectId, externalKey }`.

```json
"data": {
  "before": {
    "id": "…",
    "projectId": "…",
    "userId": "…",
    "externalKeys": [{ "projectId": "…", "externalKey": "legacy-1234" }]
  }
}
```

- **What it is.** The `externalKey` is the identifier your [CDM import](./cdm-import-export.md) gave the user in that project: the user's `externalKey` marker when it is a source-system key, otherwise the `metadata.legacy.id` the importer declared on the user (`cdmSource.legacy.id`, see [Row metadata](./cdm-import-export.md#row-metadata)). It is a **pseudonymous source-system identifier**: it means something only next to your own system's data. A value that looks like an e-mail address (any value containing `@`), is blank or is longer than 255 characters is never emitted, and nothing else from the import payload is read: no e-mail, name, hash or other metadata.
- **Filtered to the receiving project.** One `user.deleted` reaches the subscription of every project the user belonged to, and each delivery carries only the entry whose `projectId` is the subscription's own project; a subscription never sees the key another project's import attached. A delivery to a subscription that names no project carries `[]`.
- **Empty for a Grant-native user.** The list is always present on these two events and is `[]` for a user no import marked, or when no key qualifies in the receiving project, so a receiver tells "no key" from "Grant older than v1.20.2", where the field is absent. An event recorded before that version and delivered after it carries no field either.
- **Kept on a hard delete.** `user.deleted` carries the key when the user is hard deleted too: it identifies the record in your system, not the person, and the event log is not purged by Grant.
- **Rows imported before v1.18.2** carry no marker on the membership row; their key comes from the row's `cdmSource.legacy.id`, so a re-import is needed only when the importer never declared one.

Update events (`role.updated`, `resource.updated`, ...) carry the same projection of the snapshot before the change, so `before.name` is the previous name next to the `delta`. `tag.linked` and `tag.unlinked` are unchanged: they carry `{ tagId, targetKind, targetId }` in `data.after` and no `before`.

`grantactor` is the user who made the change; `grantsubjectuser` is the user the event is about, for events that have one (for example `user.role_revoked`, `user.group_revoked`, `project.user_removed`, `organization.member_removed`). Both are `null` when absent. `grantsubjectuser` stays the primary way to read whose access was revoked or removed, and `data.before` adds _which_ role, group or permission it was; `subject` is the id of the changed record (such as the role assignment), not the user. An event caused by a project-level API key has no user behind it (the key id is not a user), so its `grantactor` is the system user; the key id is kept on the stored event for audit and is never part of a webhook delivery.

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
