---
'grant-api': patch
---

Fix organizationMembers HTTP 500 when listing members with pending invitations: alias every member ∪ invitation union column uniquely so ORDER BY is no longer ambiguous.
