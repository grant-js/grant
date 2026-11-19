---
'grant-web': patch
'@grantjs/schema': patch
---

Relationship count chips preview what they count. Hovering (after a short delay), focusing or tapping "3 roles" on a user, "2 groups" on a role, "6 permissions" on a group, or a tag count on users, roles, groups and permissions fetches that one entity's relationship and lists up to ten items, each linking to its detail page (tags as chips), with "View all" to the entity's page when there are more. Nothing is fetched before that. `@grantjs/schema` adds the four operation documents behind it (`GetUserRelationsPreview`, `GetRoleRelationsPreview`, `GetGroupRelationsPreview`, `GetPermissionRelationsPreview`); the GraphQL schema itself is unchanged.
