---
'grant-api': minor
'@grantjs/schema': minor
---

Projects can opt in to exportable API-key secrets (`Project.exportableApiKeySecrets`, off by default) through `setProjectExportableApiKeySecrets` / `PUT /api/projects/{id}/exportable-api-key-secrets`, gated by the new `Project:SetExportableApiKeySecrets` held by Owner and Admin; audited; migration 0094; one new route. Enabling needs `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY`. The flag changes nothing yet: it is read by later releases of the feature.
