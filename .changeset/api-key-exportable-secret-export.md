---
'grant-api': minor
'@grantjs/schema': minor
---

`exportProjectUserCredentials` / `POST /api/users/credentials/export` accept `kinds: [API_KEY_SECRET]` (a new `CredentialKind`) and return, per member, `apiKeySecrets`: their live project-user API keys of the project with the key id, `clientId`, the fingerprint (SHA-256 of the secret as issued, `null` for a key created before it existed) and the plaintext `secret` (88-character standard base64) for keys the project keeps an exportable copy of, `null` otherwise. `apiKeySecrets` is `null` when the kind was not requested. The permission is unchanged (`ProjectUser:ExportCredentials`), the call is still one transaction, and every exported secret is audited with one row on the API-key audit log (the key id, never the secret) in addition to the export's summary row. The decision is recorded in ADR 0013. Additive; no route changes.
