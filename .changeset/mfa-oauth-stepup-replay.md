---
'@grantjs/client': patch
---

Add `onMfaRequired` callback to `GrantClientConfig` for REST-side MFA step-up with shared-promise coalescing, so 403 MFA_REQUIRED responses trigger the step-up dialog and transparently retry the request after verification.
