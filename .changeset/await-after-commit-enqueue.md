---
'grant-api': patch
---

Fix background jobs never being queued on AWS Lambda: the SQS enqueue behind project import/export (and the event relay) ran after the HTTP response was sent, so Lambda froze the environment before `SendMessage` completed and the job stayed `pending` forever. After-commit callbacks now run once the transaction has committed and are awaited before the response is flushed; a failed enqueue is logged with the job id.
