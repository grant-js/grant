---
'grant-api': minor
'@grantjs/schema': minor
---

A CDM import can carry the password hash a legacy system already holds, so migrated users keep their existing password (ADR 0010). A user with `key.findBy: email` takes `password: { algorithm: 'bcrypt', hash }` on both transports (GraphQL `UserCdmInput.password`, REST `users[].password`): a bcrypt hash with a `$2a$`, `$2b$` or `$2y$` prefix, as Go's `bcrypt.GenerateFromPassword` writes, with a cost from 4 to 15. Anything else, and a `password` on a user not identified by email, is a validation error that never repeats the hash.

The hash is stored where platform email and password login reads it (`providerData.hashedPassword` of the email authentication method), marked `providerData.passwordSource: 'cdm-import'`. An imported credential belongs to the importing system until the password is set, changed or reset in Grant, which now removes the marker: a later import of the same project replaces an imported credential whose hash differs and leaves an identical one alone, and never touches a password set in Grant. An absent `password` never removes a stored credential, and `replace` keeps the credentials of the users it re-creates. A credential is written only for an identity the import creates, or one an earlier import of this project created that nobody has verified or given a password since; any other existing identity is left untouched. `SyncProjectResult` gains `passwordsImported`, `passwordsUpdated`, `passwordsUnchanged` and `passwordsSkippedExisting`.

The hash is kept out of metadata, search tokens, audit values and events. It stays in an inline job's stored payload while the job is pending or running, because the worker reads it from there, and is replaced by `[redacted]` when the job completes, fails or is cancelled; `GET /api/projects/{id}/sync/jobs/{jobId}/payload` always shows `[redacted]`. Signing in to project apps with the imported password is a follow-up (ADR 0010, part b).
