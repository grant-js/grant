---
'grant-api': patch
---

API-key role assignment is hardened: a project API key may only be created, rotated, revoked or deleted with a standard organization or account role of strictly lower level than the caller's; roles without a level are refused. Member role changes and invitations are refused for roles without a level.
