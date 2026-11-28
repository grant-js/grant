---
'grant-api': minor
'grant-web': minor
'@grantjs/schema': minor
---

Roles, groups and users show what they are assigned to, as count chips that preview on hover.

- **Schema:** `Role.userCount`, `Group.roleCount` and `User.groupCount`, plus the lists behind the first two: `Role.users` and `Group.roles`, each with `page` and `limit`. Counts are direct relations only. A role's users are those it is assigned to directly (`user_roles`), not users who get it some other way. There is no project table for role assignments, so in a project (and in an organization) they are the global assignments of that scope's users. A group's roles are the scope's roles that include the group. A user's groups are their direct groups in the scope, not those a role brings.
- **Authorization:** `Role.users` checks `User:Query`, the users list's own permission, and `Group.roles` checks `Role:Query`, the roles list's. Without it the field is an authorization error; the counts still resolve.
- **API:** the role, group and user lists count a page at once, one grouped query per count. REST takes the counts in `?fields=` (`userCount` on roles, `roleCount` on groups, `groupCount` on users).
- **Database:** partial indexes (`WHERE deleted_at IS NULL`) on `user_roles (role_id)` and `role_groups (group_id)`. A user's groups already use the unique `user_groups (user_id, group_id)` index.
- **Web:** the role list has a Users chip, the group list a Roles chip, and the user list Groups and Permissions chips. They open like the other relationship chips. A user's chips list their direct groups and permissions of the scope. A viewer who may not list users or roles sees the count and "Not available".
- **Operations:** `GetRoleRelationsPreview` takes `$withUsers`, `$page` and `$limit`; `GetGroupRelationsPreview` takes `$withRoles`; `GetUserRelationsPreview` takes `$withGroups` and `$withPermissions`. Each has a default, so existing callers are unchanged. `getUsersList` also selects `permissionCount`, and `Me` selects `groupCount` for the account owner.
