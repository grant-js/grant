---
'@grantjs/schema': minor
---

Add the `setProjectUserPassword` mutation, the `exportProjectUserCredentials` query with the `CredentialKind` enum and its input and result types, the export-gated `ProjectUser.passwordCredential` field, and the webhook-only `project.user_password_set` event (ids and credential source only, never a hash or a password).
