---
'@grantjs/schema': minor
---

Add the webhook-only `project.user_identity_linked` event: a project member was replaced by the existing identity that holds an email address. `data.after` carries `projectId`, `fromUserId` and `toUserId` only, never the address or an import key; it is not a removal.
