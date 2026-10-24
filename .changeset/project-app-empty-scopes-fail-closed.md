---
'grant-api': patch
---

Project-app tokens no longer mint when the consent intersection is empty, and `Grant.isAuthorized` denies `projectApp` when `scopes` is missing or empty, so an empty claim cannot fall through to the user's full project RBAC.
