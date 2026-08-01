---
'grant-api': minor
'grant-web': minor
'@grantjs/schema': minor
'grant-docs': minor
---

Add a domain-event backbone with project webhooks and in-app notifications.

Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.
