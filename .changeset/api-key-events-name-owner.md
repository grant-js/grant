---
'grant-api': patch
---

`api_key.created`, `api_key.rotated` and `api_key.revoked` now name the key's owning project user as `grantsubjectuser`, as `api_key.deleted` already did, and reach the owning project's subscriptions; additive, no route changes.
