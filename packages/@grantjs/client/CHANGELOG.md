# @grantjs/client

## 1.0.1

### Patch Changes

- 994a631: Add `onMfaRequired` callback to `GrantClientConfig` for REST-side MFA step-up with shared-promise coalescing, so 403 MFA_REQUIRED responses trigger the step-up dialog and transparently retry the request after verification.
