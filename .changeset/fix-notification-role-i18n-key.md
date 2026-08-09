---
'grant-api': patch
---

Fix notification text showing a raw i18n key (e.g. `roles.names.personalAccountOwner`) instead of the role's display name for system-role assign/revoke events. System roles now resolve to their translated label; the two `ACCOUNT_ROLES` (`personalAccountOwner`, `organizationAccountOwner`) that were missing an English/German translation entirely have been added.
