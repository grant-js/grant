# @grantjs/cli

## 1.18.11

No changes in this release.

## 1.18.10

No changes in this release.

## 1.18.9

No changes in this release.

## 1.18.8

No changes in this release.

## 1.18.7

No changes in this release.

## 1.18.6

No changes in this release.

## 1.18.5

No changes in this release.

## 1.18.4

No changes in this release.

## 1.18.3

No changes in this release.

## 1.18.2

No changes in this release.

## 1.18.1

No changes in this release.

## 1.18.0

### Minor Changes

- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

## 1.17.0

No changes in this release.

## 1.16.1

No changes in this release.

## 1.16.0

No changes in this release.

## 1.15.0

No changes in this release.

## 1.14.3

No changes in this release.

## 1.14.2

No changes in this release.

## 1.14.1

No changes in this release.

## 1.14.0

No changes in this release.

## 1.13.1

No changes in this release.

## 1.13.0

### Minor Changes

- 70afd4e: Agent-first CLI: profile/env credentials, `grant whoami`, `grant api`, OpenAPI-named REST commands, optional origin-verify header, and body refresh tokens for session profiles.

## 1.12.0

No changes in this release.

## 1.11.0

No changes in this release.

## 1.10.0

No changes in this release.

## 1.9.2

## 1.9.1

## 1.9.0

## 1.8.0

## 1.7.0

## 1.6.2

## 1.6.1

## 1.6.0

## 1.5.5

## 1.5.4

## 1.5.3

## 1.5.2

## 1.5.1

## 1.5.0

## 1.4.2

## 1.4.1

## 1.4.0

## 1.3.3

## 1.3.2

## 1.3.1

## 1.3.0

## 1.2.0

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

## 1.1.3

## 1.1.2

## 1.1.1

## 1.1.0

## 1.0.0

Initial public release of the Grant CLI.
