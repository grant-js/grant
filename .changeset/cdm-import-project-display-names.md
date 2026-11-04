---
'grant-api': minor
'@grantjs/schema': minor
---

A CDM import now sets each provisioned user's name **per project**. A project keeps its own name for a person: the import writes the document's trimmed `name` to the project membership's `display_name` (the field that already overlays `users.name` in project scope, `displayName ?? name`) when it differs, for every provisioned user, created, reused or matched, and the global `users.name` is not changed. Before, two projects importing the same person could not keep different names, and a matched or shared user showed another project's name. The write is the ordinary `ProjectUserService.updateProjectUserProfile` (audit row; events, including `project.user_profile_updated`, are suppressed during an import). A later replace import overwrites an operator's or self-service edit of the project display name, and a name longer than 255 characters fails the import (it is not truncated). `SyncProjectResult.projectDisplayNamesUpdated` counts the writes, in the import result and the sync job's result.

Docs correction: the 6e6af55 changelog entry and the docs said a rename publishes one `user.updated` event; events are suppressed during an import, so renames and display-name updates write audit rows only.
