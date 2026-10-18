---
'grant-api': minor
'grant-web': minor
'grant-docs': minor
'@grantjs/schema': minor
'@grantjs/client': minor
'@grantjs/server': minor
'@grantjs/cli': minor
---

Webhooks now report every way access or an entity can change, so a consumer that keeps a copy of who holds what can stay correct. **Deleting a group now removes its memberships and emits one `user.group_revoked` per member**: a soft delete left the `user_groups` rows active (pointing at a deleted group) and a hard delete removed them without an event. **Removing a project member now revokes the user's project roles, groups and direct permissions first** (`user.role_revoked`, `user.group_revoked`, `user.permission_revoked`), where before only the membership row was removed. Deleting a role or a permission already emitted its revokes and is unchanged; there is no cap on the number of revokes, so a large delete is slower, not lossy. Ten event types were added, all webhook-only (no notification or email is created for them): `user.created`, `user.updated` and `user.deleted` (ids and the names of changed fields only; `user.deleted` reaches the user's project subscriptions and is emitted by self-deletion and account deletion), `project.user_updated` (project-member metadata), `api_key.deleted` (with the owning user as subject only when the key has exactly one), `tag.created`, `tag.updated`, `tag.deleted`, and `tag.linked` / `tag.unlinked` for tags on users, groups, roles, permissions and resources (`data.after` is `{ tagId, targetKind, targetId }`). Redaction is unchanged and there is no migration; subscriptions listing event types by name are unaffected, and the new types appear in the subscription picker.
