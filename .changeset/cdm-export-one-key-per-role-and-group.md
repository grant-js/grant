---
'grant-api': patch
---

A CDM export of a project whose roles or groups an earlier import created can be imported again. The export named such a role by a generated key in `roles[]` but by the importer's key in `users[].roles`, so the re-import failed with `Unknown roleTemplateKey`. A group that a role links and a user is also directly assigned had the same split between `groups[]` and `users[].groups`. Roles and groups now have one export key wherever they are named: the importer's key when an import created them, otherwise the generated `cdm-role-…` / `cdm-group-…` key as before.
