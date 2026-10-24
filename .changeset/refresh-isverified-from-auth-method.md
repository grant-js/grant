---
'grant-api': patch
---

Session refresh now copies `isVerified` from the session’s authentication method (the same source as login) instead of defaulting the JWT claim to `true`. Unverified users stay behind the email-verification wall after the access token refreshes.
