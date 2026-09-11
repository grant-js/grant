---
'grant-api': minor
'grant-web': minor
'@grantjs/schema': minor
'grant-docs': minor
---

Add organization logos that owners can upload and that replace initials in lists, the edit dialog, and the organization switcher.

The logo is stored as `pictureUrl`, written only through `uploadOrganizationPicture` / `POST /api/organizations/:id/picture` (MIME and size checks, public storage). `Organization:UploadPicture` is granted to Organization Owner. Existing deployments need `db:seed` so the new permission is inserted.
