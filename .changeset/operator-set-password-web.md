---
'grant-web': patch
---

Operators with the `ProjectUser:SetPassword` permission get a "Set password" action on project users, with a confirmed-password dialog that applies the same password policy as the settings form and never keeps or repeats the value. The permission picker now shows the names and descriptions of `ProjectUser:SetPassword` and `ProjectUser:ExportCredentials`, and the webhook event list labels `project.user_password_set` (English and German). Also adds the missing translation for `project.user_email_changed` from #637.
