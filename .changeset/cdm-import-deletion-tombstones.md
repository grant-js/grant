---
'grant-api': minor
'@grantjs/schema': minor
---

When a person deletes an identity a CDM import created or marked, Grant records a tombstone (project, kind, a fingerprint of the import key; no personal data), and later imports of that project do not recreate the identity, its membership, credential or API keys. `SyncProjectResult.usersSkippedTombstoned` counts the users skipped. A tombstone blocks only the creation of an identity: a document user that resolves to a live identity (a matched `grantUserId`, a live e-mail identity or key) is imported as usual, and it is written only for a self-deletion, never when an operator deletes someone else or removes a member. The e-mail identity lookup of an import no longer treats the e-mail method of a deleted account as a live identity. Requires `CDM_API_KEY_FINGERPRINT_HMAC_SECRET`. Adds the table `cdm_import_tombstones` (migration 0093); no route changes.
