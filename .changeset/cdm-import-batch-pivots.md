---
'grant-api': patch
'grant-docs': patch
---

Batch CDM import user-role, group-permission, and project pivot writes. Import-only existence loads use `unboundedList` so batches larger than the public page cap still resolve. HTTP assignment APIs stay sequential. The import remains one all-or-nothing transaction.
