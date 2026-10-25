---
'grant-api': patch
---

Return the scoped RLS request-transaction client to the pool at COMMIT. After-commit work (job and webhook enqueue) runs on the pool afterward, still before the HTTP response is flushed, so Lambda freeze cannot drop the enqueue and a failed COMMIT is not answered as success.
