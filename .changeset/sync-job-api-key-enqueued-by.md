---
'grant-api': patch
---

Allow project-level API keys to enqueue CDM sync and export jobs by mapping `enqueuedById` to the system user when the JWT `sub` is the API key id sentinel (`sub === jti`), fixing FK violations on `project_sync_jobs.enqueued_by_id`.
