---
'grant-api': patch
---

Operators can set a project user's password. Adds the `setProjectUserPassword` GraphQL mutation and `PUT /api/users/:id/password` (project scope only; the user must already be a member; the password policy is checked before anything is written and a refusal never contains the value). The write uses the new `admin-set` credential source, resets the project lockout, revokes the user's project-app OAuth grants and leaves platform sessions and the Email method's verification alone. An operator-set password is final with respect to the CDM import.

Adds the permission `ProjectUser:SetPassword`, granted to the Project User Owner and Admin groups by default and extensible to any other group, and the permission `ProjectUser:ExportCredentials`, seeded as a standalone permission with no group (reserved for the credential export that follows). Both reach existing deployments through the idempotent permission seed.

Publishes the webhook-only `project.user_password_set` event on every non-import project credential write that changes the stored hash (`admin-set`, `reset`, a future `change`). Its payload is `{ projectId, userId, source }` and never carries a password or a hash. A CDM import publishes nothing, like every other import write.
