---
'grant-api': patch
---

Run IP and auth-sensitive rate limits before request context so a 429 does not authenticate or construct the handler toolbox. Optional per-tenant limits still run after authenticate.
