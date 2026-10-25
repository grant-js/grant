---
'grant-api': patch
---

Invalidate cached authorization results for the written tenant only, so an IAM write in tenant A no longer drops tenant B's hot allow-cache.
