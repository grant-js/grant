---
'grant-web': minor
---

Project API keys get a dedicated create view: the authorization model is chosen first (a role or a set of permissions), then a role selector or a permission picker grouped by resource with an all-actions toggle and a search box, limited to what the signed-in user may attach. A key detail view shows a scopes card that edits permissions in place, and a role key can be converted to scopes through an explicit, confirmed action. Which actions the key list offers is now derived from what the user may attach.
