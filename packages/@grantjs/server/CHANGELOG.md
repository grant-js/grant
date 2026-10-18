# @grantjs/server

## 1.18.0

### Minor Changes

- 2d0528c: Webhook deliveries now say **which user an event is about**. The CloudEvents envelope has a new extension attribute, `grantsubjectuser: { "userId": "…" }` (or `null` when the event has no subject user), next to `grantactor`. Revoke and remove events such as `user.role_revoked`, `user.group_revoked`, `user.permission_revoked` and `project.user_removed` used to arrive with an empty `data` (the internal `before` snapshot is not delivered) and a `subject` that is the id of the assignment record, so a consumer could not tell whose access changed; it can now read the user id from `grantsubjectuser`. `data` and redaction are unchanged, and the new attribute is additive.

### Patch Changes

- Updated dependencies [b4a71fd]
- Updated dependencies [366391c]
- Updated dependencies [2d0528c]
  - @grantjs/schema@1.18.0

## 1.17.0

### Patch Changes

- Updated dependencies [87ca954]
- Updated dependencies [bb65914]
  - @grantjs/schema@1.17.0

## 1.16.1

### Patch Changes

- Updated dependencies [d7d869d]
  - @grantjs/schema@1.16.1

## 1.16.0

### Patch Changes

- Updated dependencies [bf408fb]
  - @grantjs/schema@1.16.0

## 1.15.0

### Patch Changes

- Updated dependencies [65d1ec4]
  - @grantjs/schema@1.15.0

## 1.14.3

### Patch Changes

- @grantjs/schema@1.14.3

## 1.14.2

### Patch Changes

- @grantjs/schema@1.14.2

## 1.14.1

### Patch Changes

- @grantjs/schema@1.14.1

## 1.14.0

### Patch Changes

- @grantjs/schema@1.14.0

## 1.13.1

### Patch Changes

- @grantjs/schema@1.13.1

## 1.13.0

### Patch Changes

- @grantjs/schema@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [6425580]
  - @grantjs/schema@1.12.0

## 1.11.0

### Patch Changes

- @grantjs/schema@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [3bcfc95]
  - @grantjs/schema@1.10.0

## 1.9.2

### Patch Changes

- @grantjs/schema@1.9.2

## 1.9.1

### Patch Changes

- @grantjs/schema@1.9.1

## 1.9.0

### Patch Changes

- Updated dependencies [099972d]
  - @grantjs/schema@1.9.0

## 1.8.0

### Patch Changes

- @grantjs/schema@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [31399fc]
  - @grantjs/schema@1.7.0

## 1.6.2

### Patch Changes

- @grantjs/schema@1.6.2

## 1.6.1

### Patch Changes

- @grantjs/schema@1.6.1

## 1.6.0

### Patch Changes

- @grantjs/schema@1.6.0

## 1.5.5

### Patch Changes

- @grantjs/schema@1.5.5

## 1.5.4

### Patch Changes

- 9caf929: Fix grant-web Docker startup by shipping @swc/helpers ESM in the Next standalone bundle (next 16.3.2).
  - @grantjs/schema@1.5.4

## 1.5.3

### Patch Changes

- Updated dependencies [178dd71]
  - @grantjs/schema@1.5.3

## 1.5.2

### Patch Changes

- @grantjs/schema@1.5.2

## 1.5.1

### Patch Changes

- @grantjs/schema@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [c515e3e]
  - @grantjs/schema@1.5.0

## 1.4.2

### Patch Changes

- @grantjs/schema@1.4.2

## 1.4.1

### Patch Changes

- Updated dependencies [4fcca1d]
  - @grantjs/schema@1.4.1

## 1.4.0

### Patch Changes

- Updated dependencies [fd61e91]
  - @grantjs/schema@1.4.0

## 1.3.3

### Patch Changes

- @grantjs/schema@1.3.3

## 1.3.2

### Patch Changes

- @grantjs/schema@1.3.2

## 1.3.1

### Patch Changes

- @grantjs/schema@1.3.1

## 1.3.0

### Patch Changes

- @grantjs/schema@1.3.0

## 1.2.0

### Patch Changes

- @grantjs/schema@1.2.0

## 1.1.7

### Patch Changes

- @grantjs/schema@1.1.7

## 1.1.6

### Patch Changes

- @grantjs/schema@1.1.6

## 1.1.5

### Patch Changes

- @grantjs/schema@1.1.5

## 1.1.4

### Patch Changes

- Updated dependencies [6abd436]
  - @grantjs/schema@1.1.4

## 1.1.3

### Patch Changes

- Updated dependencies [8c9af41]
  - @grantjs/schema@1.1.3

## 1.1.2

### Patch Changes

- Updated dependencies [01e0ed1]
  - @grantjs/schema@1.1.2

## 1.1.1

### Patch Changes

- @grantjs/schema@1.1.1

## 1.1.0

### Patch Changes

- @grantjs/schema@1.1.0

## 1.0.0

Initial public release of server-side Grant SDK adapters.
