---
'grant-api': patch
---

Fix the blank Swagger UI at `/api-docs`. The page now loads the OpenAPI document from `/api-docs.json` instead of having it inlined into `swagger-ui-init.js`, where a `$` pattern in a description (the CDM bcrypt hash) broke the script. A `?url=` query parameter no longer loads another document into the page.
