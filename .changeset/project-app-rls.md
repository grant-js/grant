---
'grant-api': patch
---

Enable PostgreSQL row-level security on `project_apps` and `project_oauth_connections` so a missed application `WHERE` cannot read another project's OAuth app or social-connection row.
