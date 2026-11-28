---
'grant-web': minor
'@grantjs/schema': minor
---

Users in relationship lists show their email, and metadata cards are the same on every detail page.

- **User label:** wherever a relationship lists users (the Users chip's preview on the group and permission lists, and the Users and Members cards on permission and group pages), each user shows as their name with the email muted beside it. Names are not unique, so the email tells two people of the same name apart. A user with no Email sign-in method shows the name alone. One shared `UserLabel` renders it. The preview documents select `authenticationMethods { provider providerId }` for users. Who may see the users is unchanged: the fields still require `User:Query`.
- **Metadata cards:** user, role, group and permission detail pages share one metadata card. It starts collapsed. Its JSON editor grows with its content up to `JSON_EDITOR_MAX_HEIGHT` (the cap the sync-job editors already use) and then scrolls inside itself. The permission condition editor takes the same cap.
- **Permission metadata:** the permission page gets a metadata card, saved through the existing `updatePermission`. `GetPermissions` and `UpdatePermission` now select `metadata`.
