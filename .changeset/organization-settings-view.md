---
'grant-web': minor
'grant-api': minor
'grant-docs': minor
---

Organizations have a dedicated **Settings** page (`/dashboard/organizations/{organizationId}/settings`) with a **Security** section (the "Require MFA for sensitive actions" switch, moved out of the Edit dialog, same mutation and MFA step-up) and a **Danger zone** section with **Delete organization**. Deleting now asks you to type the organization **name** instead of its id, and is available only to callers who hold `Organization:delete`.

The Edit dialog keeps only name and logo and no longer sends `requireMfaForSensitiveActions`, so saving it cannot change the MFA requirement. The organization row menu replaces **Delete** with **Settings**.

Deleting an organization is owner-only: `Organization:delete` is held by the Organization Owner group and by no other organization group. Organization admins are refused through GraphQL and REST; a unit test and an e2e scenario now pin this.
