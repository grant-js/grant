---
'grant-api': patch
'grant-docs': patch
---

CDM import now writes this project's `cdmImport` marker (`kind: 'user'`, external key) on the project membership row of every user it assigns, including an email-identified user that already had a Grant identity. The project-scoped `users` read therefore identifies the users a project imported even when the identity was reused; the global user's metadata is not changed.
