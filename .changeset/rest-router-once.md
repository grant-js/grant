---
'grant-api': patch
---

Mount one REST router for `/api` instead of allocating the route tree per request. Handlers still come from the request context.
