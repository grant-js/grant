---
'grant-api': minor
'grant-web': minor
'@grantjs/schema': minor
---

A CDM export can be imported again when its users have API keys. An export writes `clientSecret: null` on every key, which the import used to reject for the whole document. A key without a secret now creates nothing: the importing project's key that matches by `key` or `clientId` is left as it is (counted in `projectUserApiKeysUnchanged`, and not deleted on replace), and a key with no match is skipped. `SyncProjectResult.projectUserApiKeysSkippedNoSecret` counts the skipped keys, and the import job's result card shows it. Everything else in the document imports. Keys that carry a secret behave as before.
