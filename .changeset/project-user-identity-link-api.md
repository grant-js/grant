---
'grant-api': patch
---

Link a project user to the existing identity that holds an email address: `linkProjectUserIdentity` (GraphQL) and `POST /api/users/:id/link-identity` (REST), under the new `ProjectUser:LinkIdentity` permission (Owner and Admin by default), in organization projects. When set-email is refused because another member of the organization holds the address, the operator can make that identity take over the project user's membership of the project: roles, groups, permissions, tags, API keys, the project password and the CDM import marker move with the membership row, and the project user, which must not be able to sign in, is retired. The next CDM import resolves the same key or address to the identity and creates nobody. Publishes `project.user_identity_linked` (ids only) and no removal or deletion event; the identity's address gets a notice. Counts against the set-email rate-limit bucket.
