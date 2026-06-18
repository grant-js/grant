---
"grant-api": minor
"@grantjs/schema": minor
"grant-docs": minor
---

Add CDM email identity imports for project sync jobs.

CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.
