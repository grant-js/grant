---
'grant-api': patch
---

Page scoped IAM lists in SQL (search, tags, explicit ids, sort, limit) against a pivot subquery so a 50-row page does not materialize the full accessible ID set.
