---
'grant-api': patch
'@grantjs/schema': patch
---

Skip unchanged CDM API keys on replace: HMAC-SHA256 fingerprint, classify before bcrypt, and additive created/unchanged/rotated/deleted counters.
