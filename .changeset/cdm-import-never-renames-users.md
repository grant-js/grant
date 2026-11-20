---
'grant-api': patch
'@grantjs/schema': patch
---

A CDM import no longer renames users. The import writes a user's global `name` only when it creates the user, seeded from the document's trimmed `name`; after that the name belongs to the person. Before, a later import renamed a user that an earlier import of the same project had created whenever the document's name differed, even after the person was invited, signed up, claimed the identity or changed their own name, so they could find the document's name on their account. The document's name still reaches the project as the membership's `display_name` (`projectDisplayNamesUpdated`), which is what the project shows. `SyncProjectResult.usersRenamed` is deprecated and always 0 (GraphQL `@deprecated`, OpenAPI `deprecated`).
