---
'grant-api': patch
---

Add `ProjectUser:SetEmail` as an ordinary ResourceAction, granted by default to Project User Owner and Project User Admin (Organization Owner/Admin and account owner roles). Existing deployments receive it through `seedAll` on boot when `DB_BOOTSTRAP_ON_BOOT` is true (ADR 0001).
