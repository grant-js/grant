---
'@grantjs/schema': minor
---

Add the `setProjectUserPassword` mutation, the `exportProjectUserCredentials` query with the `CredentialKind` enum and its input and result types, the export-gated `User.passwordCredential` field (resolved in the request's project scope), and the webhook-only `project.user_password_set` event (ids and credential source only, never a hash or a password).
