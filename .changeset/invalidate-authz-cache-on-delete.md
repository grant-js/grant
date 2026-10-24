---
'grant-api': patch
---

Deleting a role, group, or permission now clears the authorization cache so cached grants cannot outlive the cascade.
