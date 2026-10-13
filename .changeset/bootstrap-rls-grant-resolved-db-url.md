---
'grant-api': patch
---

Run the RLS role grant during bootstrap with the database URL the app resolved, so `DB_BOOTSTRAP_ON_BOOT` works when `DB_URL` comes from AWS Secrets Manager.
