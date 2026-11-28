---
'grant-web': minor
---

Role and group detail pages list who and what they are related to, read-only.

- **Role page:** a _Users_ card with the users the role is assigned to directly, each shown with their email beside the name.
- **Group page:** a _Roles_ card with the roles of the scope that include the group.

The cards page ten at a time and link each row to its own page. They edit nothing: roles are still assigned on the user's page, and groups are still added to a role on the role's page. A viewer who may not list users or roles sees "Not available". The cards read `Role.users` and `Group.roles` through the documents the list chips already use.
