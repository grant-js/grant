---
'grant-api': patch
---

Compact audit log payloads before insert so large CDM entities (for example resources with long action lists) no longer exceed `varchar(1000)` on audit tables and abort import transactions.
