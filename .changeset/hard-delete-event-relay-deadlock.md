---
'grant-api': patch
---

Fix an intermittent deadlock when a user is hard-deleted (`DELETE /api/me/accounts` with `hardDelete`, admin user deletion, data-retention cleanup) while the event relay is fanning out that user's own events into notifications. The two transactions took the same locks in opposite order:

- The relay claims `event_log` rows, then the notification insert's foreign-key check locks the recipient's `users` row.
- The delete locks the `users` row, then `ON DELETE SET NULL` updates the same `event_log` rows.

Postgres aborted the delete, and the request failed with a 500. The hard delete now locks the user's `event_log` rows first, in the relay's order, so it waits for an in-flight batch to commit instead of deadlocking.
