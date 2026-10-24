---
'grant-api': patch
---

GraphQL `login`, `register`, and `refreshSession` now share the auth-sensitive rate-limit bucket with REST login (including unnamed documents that are those operations), so GraphQL password guessing is not limited only by the global IP cap.
