---
'grant-api': patch
'@grantjs/schema': patch
---

`user.deleted` and `project.user_removed` webhook payloads carry the removed user's import keys under `data.before.externalKeys`, filtered per subscription, so receivers can name the user after Grant has forgotten them. Each entry is `{ projectId, externalKey }`: the source-system key your CDM import attached to the user in that project (the user's `cdmImport.externalKey` marker, or the importer-declared `metadata.legacy.id` when the marker is an e-mail address). It is a pseudonymous source-system identifier, never an e-mail address, name or hash, and a delivery carries only the entry of the receiving subscription's own project. The list is always present on these two events and is `[]` for a user no import marked; the field is absent on Grant older than this version. `user.deleted` carries it on a hard delete too. Additive: existing receivers are unaffected, no route changes.
