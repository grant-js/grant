# 0012 — Webhook events reach a project whatever scope the request ran in

- **Status**: Accepted
- **Date**: 2026-10-18
- **Context**: webhook subscriptions are per project; events caused outside a project-scoped request were never delivered
- **Related**: [Events, Webhooks & Notifications](/core-concepts/events-webhooks-notifications), [Multi-tenancy](/architecture/multi-tenancy)

## Context

Line numbers below are at v1.17.0 (`c487b8fe`), the code this decision changes.

A webhook subscription belongs to one project. Whether an event reaches it was decided by one line: the dispatcher asks for the project named by the **event's scope**, and returns without fan-out when there is none (`apps/api/src/lib/webhooks/webhook-dispatcher.consumer.ts:28-29`). Only four tenants carry a project (`PROJECT_TENANTS`, `apps/api/src/lib/scope.lib.ts:49-54`, read by `tryProjectIdFromScope`, `scope.lib.ts:65-70`): `accountProject`, `organizationProject` and the two `…ProjectUser` forms.

The event's scope is not chosen by the code that publishes it. Unless the caller passes one, the publisher takes the **request's** scope, then `system` (`drizzle-event-publisher.ts:45-47`). Only `organization.*` events and `project.user_added` / `profile_updated` / `removed` set an explicit scope (`ProjectUserService.resolveProjectScope`, `apps/api/src/services/project-users.service.ts:59-85`). Every other publish site (`role.*`, `group.*`, `permission.*`, `resource.*`, the `role.*_assigned` / `user.*_assigned` pivots, `api_key.*`, `user.mfa_*`, `user.password_changed`, session revocation) inherits whatever scope the request ran in. So an event about a project's role was delivered only when the request that caused it was project-scoped, and was lost when it was not:

- an organization dashboard editing a role that belongs to a project (`organization` scope);
- a project-app end user's own requests, which run in `Tenant.ProjectUser` (`projectId:userId`, `scope.lib.ts:98-105`), the one tenant `PROJECT_TENANTS` leaves out;
- work done with no user at all: the sign-up role assignment at `apps/api/src/handlers/project-oauth.handler.ts:1137` publishes `user.role_assigned` under `system` and is never delivered.

## What was checked

**Entities carry no scope; their project is reached through a pivot.** `roles`, `groups`, `permissions`, `resources` and `api_keys` have no scope column (only their `*_audit_logs` do). Project membership is `project_roles`, `project_groups`, `project_permissions`, `project_resources`, and for API keys `project_user_api_keys`, `account_project_api_keys`, `organization_project_api_keys`. The user pivots (`user_roles`, `user_groups`, `user_permissions`, `role_groups`, …) carry no project at all: it is the role, group or permission they join that is linked to one.

**One entity can belong to several projects.** Every pivot's unique index is on the pair, not on the entity (`packages/@grantjs/database/src/schemas/project-roles.schema.ts:30`, and the same pair shape in the other five). The data model allows a shared role; no flow creates one today (`createRole` links to the request's own project), so the case is rare but not impossible.

**The dispatcher does not run in the writing transaction.** `EventRelayService.relayBatch` claims `pending` outbox rows in its **own** transaction after the writer committed and hands that transaction to each consumer (`apps/api/src/services/event-relay.service.ts:27-33`), under the owner role, outside row-level security. So resolving at dispatch time reads the **final committed state**. That is complete for creates, updates and assignments, but **it cannot recover a delete**: by then the links are gone, or soft-deleted.

**Resolving at publish time inside the service is also too late for a delete, unless the links are read first.** `RoleHandler.deleteRole` removes the pivots (`roles.handler.ts:285-303`, `removeProjectRole` then the other unlinks) before it calls `RoleService.deleteRole`, which hard-deletes and only then publishes (`roles.service.ts`, the repository delete, the audit entry, then `events.publish`). A hard delete cascades every `project_*` pivot of the entity (`onDelete: 'cascade'`). The links have to be read **before** the write.

**Publish-time reads run under the request's row-level security.** A scoped request runs in a transaction that did `SET LOCAL ROLE` to the restricted role and set `app.current_project_id` (`apps/api/src/lib/rls/rls-context.ts:96-103`, `context.middleware.ts:98`), and the pivots carry a restrictive select policy on that setting. In a request whose scope names a project, a publish-time read sees that project's pivot rows only. In an organization, account or system request the setting is empty and every row is visible.

## Decision

**An event is relevant to a project, and reaches that project's subscriptions, when the request's scope names the project or when the event is about an entity linked to it. The publisher records the linked projects in the event; the dispatcher fans out to the union.**

1. **Resolve at publish time, in the publisher, from the aggregate.** `DrizzleEventPublisher.publish` asks `ProjectLinksRepository` which projects the event's entities are linked to and writes them to the outbox row's `payload.projectIds` (`jsonb`, no migration). The entities are derived from the aggregate kind, not the event type, so a new event type about the same aggregate is covered without touching a table (`apps/api/src/lib/events/event-project-links.lib.ts`): `role`, `group`, `permission`, `resource`, `apiKey` directly; for the pivot aggregates (`roleGroup`, `rolePermission`, `groupPermission`, `userRole`, `userGroup`, `userPermission`) the role, group and permission named in the `after` (or `before`) snapshot. A pivot between two linked entities (`role.group_assigned`) takes the **union** of both sides' projects. Publish sites do not change for these events.
2. **Read the links before a delete.** `role.deleted`, `group.deleted`, `permission.deleted` and `resource.deleted` call the new `IEventPublisher.resolveLinkedProjectIds` before the repository delete and pass the result as `DomainEventInput.projectIds`; the publisher unions it with what it can still read. Four services, two lines each.
3. **The scope of the event is not rewritten.** It stays the request's scope (or `system`). The notification consumer keys audience, preferences and deep links on it, and the external envelope's `grantscope` reports it; rewriting it to a project scope would change both and would send one notification per linked project. `projectIds` is internal: it is not in the envelope, the redaction, or `data`.
4. **The dispatcher fans out over `{scope's project} ∪ event.projectIds`**, one subscription lookup per project (`webhook-dispatcher.consumer.ts`, `webhookProjectIdsOf`). `upsertPending(eventId, subscriptionId)` is already idempotent per pair, so a retried relay batch cannot duplicate a delivery. Anything that is not a uuid is dropped: it would fail the subscription query and abort the relay batch on every retry.
5. **`projectUser` is read by the dispatcher, not fixed per publish site.** A new `tryOwningProjectIdFromScope` reads index 0 of a `projectUser` scope and otherwise agrees with `tryProjectIdFromScope`. `tryProjectIdFromScope` itself is left as it is, because notification audience and deep-link resolution also use it and treat a `projectUser` scope as "no project" today. A project-app request can emit almost any event (`api_key.*`, `user.mfa_*`, `user.password_changed`, sessions), so an explicit scope at each of those sites would be the larger and easier-to-miss change.
6. **Several projects: one event, one delivery set per project.** One event id, one `sequence`, one row in `event_log`; a `webhook_delivery_attempts` row per matching subscription. The alternative, one event per project with an explicit project scope, gives each its own sequence and the scope a project subscriber would expect, but multiplies outbox rows and notifications.
7. **No project, no delivery, no error.** An entity linked to an organization or account but to no project resolves to nothing; the event is delivered to whichever project its scope names, or to none.
8. **Events about a user's own security are not entity-bound.** `user.mfa_*`, `user.password_changed` and `user.session(s)_revoked` have no pivot to a project (a user's project membership is `project_users`, not a role). They reach a project through item 5 when the request ran in that project's scope, and not otherwise. Fanning them out to every project the user is a member of is a different decision and is left out.

Explicit scopes that already exist (`organization.*`, `project.user_*`, `project_sync.*`, `signing_key.*`) are untouched.

## Why not the alternatives

**Resolve at dispatch time, in the consumer.** Simplest: no payload field, no interface change, the relay runs as the owner and sees every project, and it also sees links created after the event was published in the same transaction. Rejected as the **only** mechanism because it cannot deliver a delete (above), because the answer would depend on when the relay runs (a link changed between publish and relay changes who is told, and replays no longer reproduce the original routing), and because it leaves the routing decision unrecorded. The routing is now stored on the event row.

**Rewrite the event's scope to the project at publish time, as `project.user_added` does.** Rejected for the three reasons in item 3, and because a single event has a single scope: an entity in two projects would need one event per project.

**Add `project_id` columns to the entity tables.** Rejected: it duplicates the pivots, cannot express an entity in two projects, and is a migration across five hot tables for a routing hint.

**One new column on `event_log` for the project ids.** `payload` is already `jsonb` and already carries `aggregate`; a column would need a migration and an index for a field read once per event.

**Fan user-security events out to every project the user is in.** See item 8.

## Consequences

- A subscription now receives events from organization-dashboard edits of project entities, from project-app requests, and from system-scope flows such as the sign-up role assignment. A subscription that listed `role.updated` and used to see only project-scoped edits will see more. The envelope is unchanged; `grantscope` can now show an organization or `system` scope for an event delivered to a project.
- **Cost.** Entity-bound events do one to three extra indexed pivot reads at publish time (two pivots for a pivot event, three for an API key). Events about anything else do none. Suppressed events (CDM import) return before resolving.
- **Known limit: a project-scoped request sees only its own project's pivot rows** (row-level security, above). The project the request ran in is covered by its scope, so nothing changes for it; an entity **shared** with a second project, edited or deleted from a project-scoped request, does not reach the second project. The same entity edited from an organization, account or system request reaches both. Closing it means reading the pivots on the owner pool (`createServices` already receives `baseDb`) at the price of a second connection per entity event and of not seeing links created in the same transaction. Not done here because no flow shares an entity across projects.
- **Known limit: links created after the publish in the same transaction are not seen.** `roles.service` publishes `role.created` before `RoleHandler.createRole` links the role to its project (`roles.handler.ts:130-137`). Such a create is delivered through its request scope, which is the project; no flow creates an entity under a non-project scope and links it to a project in one transaction (CDM import does, and is suppressed).
- **Existing gap, not changed here:** the REST and GraphQL update routes for roles take the target by id and authorize on the request's scope without checking that the role belongs to it (`apps/api/src/rest/routes/roles.routes.ts`, `crud-router.ts:170-184`; no resource resolver). That is how an organization-scoped request can edit a project's role, which this ADR then makes visible to the project's webhooks. Worth its own review; the e2e scenario relies on it.
- `IEventPublisher` gains `resolveLinkedProjectIds`; any other implementation must add it.

## References

- Dispatcher and project reading: `apps/api/src/lib/webhooks/webhook-dispatcher.consumer.ts`, `apps/api/src/lib/scope.lib.ts` (`tryOwningProjectIdFromScope`)
- Publisher and entity derivation: `apps/api/src/lib/events/drizzle-event-publisher.ts`, `apps/api/src/lib/events/event-project-links.lib.ts`, `apps/api/src/repositories/project-links.repository.ts`
- Delete sites: `roles.service.ts`, `groups.service.ts`, `permissions.service.ts`, `resources.service.ts` (`apps/api/src/services/`)
- Tests: `apps/api/tests/unit/lib/webhooks/webhook-dispatcher.consumer.test.ts`, `apps/api/tests/unit/lib/events/`, `apps/api/tests/e2e/scenarios/webhooks-entity-project-scope.e2e.test.ts`
