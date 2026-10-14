---
'grant-api': patch
---

Fix background jobs never being queued on AWS Lambda: the SQS enqueue behind project import/export (and the event relay) ran after the HTTP response was sent, so Lambda froze the environment before `SendMessage` completed and the job stayed `pending` forever. After-commit callbacks now run once the transaction has committed and are awaited, for at most `JOBS_AFTER_COMMIT_TIMEOUT_MS` (default 5000), before the response is flushed; a failed enqueue is logged with the job id. The in-process node-cron adapter's `enqueue()` now returns once the job is accepted instead of running it to completion inside the request.
