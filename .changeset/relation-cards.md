---
'grant-web': minor
'@grantjs/schema': minor
---

Permission and group detail pages list who and what they are assigned to, read-only.

- **Permission page:** a _Groups_ card and a _Users_ card.
- **Group page:** a _Members_ card.

Each card pages ten at a time, and each row links to its own page. Nothing is edited there: assignments stay where they are made today, on the user's and group's pages. A viewer who may not list the related users or groups sees "Not available". The cards read the same documents as the list's count chips. `GetGroupRelationsPreview` and `GetPermissionRelationsPreview` now take `$page` and `$limit`, with defaults of 1 and 10, and select the count alongside the related items.
