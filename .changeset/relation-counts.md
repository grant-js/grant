---
'grant-api': minor
'grant-web': minor
'@grantjs/schema': minor
---

Permissions and groups show who and what they are assigned to, as count chips that preview on hover.

- **Schema:** `Permission.groupCount`, `Permission.userCount` and `Group.userCount`, plus the lists behind them: `Permission.groups`, `Permission.users` and `Group.users`, each with `page` and `limit`. User counts are direct assignments only. A user who gets a permission through a group or role is not counted, and neither is a group member through a role. In a project the counts read the project's own assignments (`project_user_groups`, `project_user_permissions`, joined to the live global row, as authorization does). In an organization they read the organization's users.
- **Authorization:** `Group.users` and `Permission.users` check `User:Query`, the users list's own permission, and `Permission.groups` checks `Group:Query`. Without it the field is an authorization error; the counts still resolve.
- **API:** the group and permission lists count a page at once, one grouped query per count. REST takes the counts in `?fields=` (`userCount` on groups; `groupCount` and `userCount` on permissions).
- **Database:** partial indexes (`WHERE deleted_at IS NULL`) on `group_permissions (permission_id)`, `user_groups (group_id)`, `user_permissions (permission_id)`, `project_user_groups (project_id, group_id)` and `project_user_permissions (project_id, permission_id)`.
- **Web:** the permission list has Groups and Users chips, and the group list has a Users chip. They open like the other relationship chips. A viewer who may not list users sees the count and "Not available".
- **Operations:** `GetGroupRelationsPreview` takes `$withUsers`, and `GetPermissionRelationsPreview` takes `$withGroups`, `$withUsers` and `$withTags`. Each has a default, so existing callers are unchanged.
