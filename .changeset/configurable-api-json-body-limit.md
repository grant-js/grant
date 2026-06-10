---
'grant-api': patch
---

Make the Express JSON request body limit configurable via `API_JSON_BODY_LIMIT_BYTES` (default 10 MiB) so large CDM sync imports can be tuned without code changes.
