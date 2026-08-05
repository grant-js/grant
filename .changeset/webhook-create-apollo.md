---
'grant-web': patch
---

Align webhook create with full-page create viewers and route webhook/notification UI data through Apollo.

Replace the create dialog with a `/webhooks/new` create viewer (shared events DataTable for create and edit), polish the one-time signing-secret dialog, and migrate webhooks and notifications hooks off REST so idle 401s refresh via Apollo like the rest of the dashboard.
