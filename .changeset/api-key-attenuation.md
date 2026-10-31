---
'grant-api': minor
---

Project API keys are attenuated: a key's role must be covered by what its creator can do in the key's scope, for account and organization projects alike, at create and before revoke, rotate and delete. API-key role assignment is hardened accordingly and a regression test pins it. `ApiKey:Update` is a new action held by Owner, Admin and Dev. Migration 0096; no route changes.
