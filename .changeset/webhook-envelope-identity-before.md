---
'grant-api': patch
'grant-docs': patch
'@grantjs/schema': patch
---

Webhook envelopes now carry an identity-only `before` (ids, keys, names) for delete and revoke events, so subscribers can tell what was removed. `after` and `delta` are unchanged; no personal data is added.
