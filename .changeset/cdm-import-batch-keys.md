---
'grant-api': patch
'grant-docs': patch
---

Batch CDM import API-key inserts and hash BYOK secrets outside the import transaction at bcrypt-10. HTTP `createApiKey` stays sequential. Persist only hashes; client-id uniqueness stays fail-closed. The import remains one all-or-nothing transaction.
