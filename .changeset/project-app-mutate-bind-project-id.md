---
'grant-api': patch
---

Project-app update and delete now require the app to belong to the scoped project and persist with `{ id, projectId }`, so a cross-project id cannot mutate or soft-delete another project's OAuth app.
