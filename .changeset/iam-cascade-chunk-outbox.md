---
'grant-api': patch
---

IAM cascade deletes now chunk teardown and batch outbox inserts, still emitting one revoke per subject.
