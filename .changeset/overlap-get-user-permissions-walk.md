---
'grant-api': patch
---

Overlap independent RBAC lookups on an authorization cache miss so `getUserPermissions` no longer walks the four permission sources as a single sequential chain.
