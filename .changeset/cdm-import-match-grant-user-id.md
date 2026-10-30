---
'grant-api': minor
'@grantjs/schema': minor
---

A CDM `users[]` entry keyed by `findBy: key` may name an existing Grant user with `key.grantUserId`; the import marks that user with the key for the importing project instead of creating a new one, and later imports resolve the key to the same user. The key lookup now also reads the project membership row's marker. The named user must exist and be live, and must not already be imported into the project under another key; a refusal fails the import and names the position in `users[]`, never the key or the id. Membership still comes from the document's assignment (`roles`, `groups` or `permissions`), as for `findBy: id`. Additive: the field is optional, existing documents behave as before, no route changes.
