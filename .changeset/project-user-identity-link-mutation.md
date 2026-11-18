---
'@grantjs/schema': minor
---

Add the `linkProjectUserIdentity` mutation and its `LinkProjectUserIdentityInput` (organization project scope only): link a project member that cannot sign in to the existing identity of the organization that holds an email address. That identity takes over the member's membership of the project, and the member is retired. Publishes `project.user_identity_linked`, never a removal or deletion event.
