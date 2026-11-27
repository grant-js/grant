---
'grant-api': patch
---

A CDM import now tags a group that only users reference (`users[].groups`, listed by no role). The group's `tags` and `primaryTag` are linked as they are for a group a role lists. Before this fix, such groups were created without tags. A group tag missing from the document's `tags` section now fails the import, as it does on the role path. Re-running a `replace` import recreates the groups with their tags.
