---
'grant-api': minor
'grant-web': minor
'grant-docs': minor
'@grantjs/schema': minor
---

**Webhook subscriptions now receive every event relevant to their project, whatever scope the request ran in** (ADR 0012). Until now an event reached a project's subscriptions only when the request that caused it was project-scoped, so editing a project's role from an organization dashboard, a project-app end user's own requests (`projectUser` scope) and system-scope flows such as the sign-up role assignment were never delivered. The publisher now records, on the outbox row, the projects that the role, group, permission, resource or API key an event is about (or a user's assignment to one) is linked to, and the dispatcher fans out to those projects together with the project named by the request scope; an entity linked to several projects reaches each of them, and one linked to no project delivers nothing. A `projectUser` scope is now read as its project. The event scope, the webhook envelope and notifications are unchanged, no event type was added, and there is no migration. A subscription that listed `role.updated` or `user.role_assigned` will see more events than before. `IEventPublisher` gains `resolveLinkedProjectIds`, which the role, group, permission and resource delete paths use to read project links before the delete removes them.
