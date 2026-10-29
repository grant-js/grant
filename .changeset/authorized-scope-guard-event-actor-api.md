---
'grant-api': patch
---

Events published by a project-level API key are attributed to the system user (the key id is recorded alongside) instead of failing on the actor foreign key, so API-key callers can set a project user's e-mail or password.
