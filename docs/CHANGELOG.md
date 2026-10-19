# grant-docs

## 1.18.0

### Minor Changes

- b4a71fd: Webhooks now report every way access or an entity can change, so a consumer that keeps a copy of who holds what can stay correct. **Deleting a group now removes its memberships and emits one `user.group_revoked` per member**: a soft delete left the `user_groups` rows active (pointing at a deleted group) and a hard delete removed them without an event. **Removing a project member now revokes the user's project roles, groups and direct permissions first** (`user.role_revoked`, `user.group_revoked`, `user.permission_revoked`), where before only the membership row was removed. Deleting a role or a permission already emitted its revokes and is unchanged; there is no cap on the number of revokes, so a large delete is slower, not lossy. Ten event types were added, all webhook-only (no notification or email is created for them): `user.created`, `user.updated` and `user.deleted` (ids and the names of changed fields only; `user.updated` and `user.deleted` reach the user's project subscriptions, and `user.deleted` is emitted by self-deletion and account deletion), `project.user_updated` (project-member metadata), `api_key.deleted` (with the owning user as subject only when the key has exactly one), `tag.created`, `tag.updated`, `tag.deleted`, and `tag.linked` / `tag.unlinked` for tags on users, groups, roles, permissions and resources (`data.after` is `{ tagId, targetKind, targetId }`). Redaction is unchanged and there is no migration; subscriptions listing event types by name are unaffected, and the new types appear in the subscription picker.
- 366391c: **Webhook subscriptions now receive every event relevant to their project, whatever scope the request ran in** (ADR 0012). Until now an event reached a project's subscriptions only when the request that caused it was project-scoped, so editing a project's role from an organization dashboard, a project-app end user's own requests (`projectUser` scope) and system-scope flows such as the sign-up role assignment were never delivered. The publisher now records, on the outbox row, the projects that the role, group, permission, resource or API key an event is about (or a user's assignment to one) is linked to, and the dispatcher fans out to those projects together with the project named by the request scope; an entity linked to several projects reaches each of them, and one linked to no project delivers nothing. A `projectUser` scope is now read as its project. The event scope, the webhook envelope and notifications are unchanged, no event type was added, and there is no migration. A subscription that listed `role.updated` or `user.role_assigned` will see more events than before. `IEventPublisher` gains `resolveLinkedProjectIds`, which the role, group, permission and resource delete paths use to read project links before the delete removes them. The resource delete handler, which unlinks the project pivots before the services publish, now passes the projects it read first, so an organization-scope resource delete reaches the subscriptions of the projects it was linked to.
- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

## 1.17.0

No changes in this release.

## 1.16.1

No changes in this release.

## 1.16.0

No changes in this release.

## 1.15.0

No changes in this release.

## 1.14.3

No changes in this release.

## 1.14.2

No changes in this release.

## 1.14.1

No changes in this release.

## 1.14.0

No changes in this release.

## 1.13.1

No changes in this release.

## 1.13.0

No changes in this release.

## 1.12.0

No changes in this release.

## 1.11.0

No changes in this release.

## 1.10.0

### Minor Changes

- 3bcfc95: Add per-project GitHub and Google OAuth connections (bring-your-own IdP). Projects can store their own GitHub/Google client credentials; secrets are write-only and never returned on read. Hosted authorize and callback resolve the same project client.

## 1.9.2

## 1.9.1

## 1.9.0

### Minor Changes

- 099972d: Add project and project-app branding for hosted OAuth: uploadable logos, primary color, help-panel visibility, and an app-level light/dark/system lock on sign-in and authorize pages.

## 1.8.0

### Minor Changes

- f8d52ec: Add Google as a platform and project OAuth sign-in provider, with account linking, verified contact-email bind, and IdP profile picture inheritance.

## 1.7.0

### Minor Changes

- 31399fc: Add organization logos that owners can upload and that replace initials in lists, the edit dialog, and the organization switcher.

  The logo is stored as `pictureUrl`, written only through `uploadOrganizationPicture` / `POST /api/organizations/:id/picture` (MIME and size checks, public storage). `Organization:UploadPicture` is granted to Organization Owner. Existing deployments need `db:seed` so the new permission is inserted.

## 1.6.2

## 1.6.1

## 1.6.0

## 1.5.5

## 1.5.4

## 1.5.3

## 1.5.2

## 1.5.1

## 1.5.0

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

## 1.4.2

## 1.4.1

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.

## 1.4.0

### Minor Changes

- fd61e91: Add CDM email identity imports for project sync jobs.

  CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.

## 1.3.3

## 1.3.2

## 1.3.1

## 1.3.0

## 1.2.0

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

## 1.1.3

## 1.1.2

## 1.1.1

## 1.1.0
