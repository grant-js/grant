---
'grant-api': minor
'@grantjs/schema': minor
---

A CDM import now keeps the names of the users it created in line with the document: when a later import of the project lists a user it created earlier under a different `name`, the user is renamed (`findBy: key` and `findBy: email`). Before, a name was written only on create, so a user renamed at the source kept the old name forever. An account that existed before the import and was matched by e-mail or by `grantUserId` keeps its own name. The rename is the ordinary user update (audit row and a `user.updated` event naming the changed field, no value), and only when the name differs. `SyncProjectResult.usersRenamed` counts the renames, in the import result and the sync job's result.
