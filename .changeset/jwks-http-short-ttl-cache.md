---
'grant-api': patch
---

JWKS HTTP endpoints now cache getPublicKeysForJwks payloads per issuer for a short TTL.
