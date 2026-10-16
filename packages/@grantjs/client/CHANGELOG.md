# @grantjs/client

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

### Minor Changes

- 7c06af4: **BREAKING** Project apps use authorization-code + PKCE. Consent redirects with `?code=&state=` (the `#access_token=` fragment is gone). Exchange at `POST /api/auth/project/token` (`authorization_code` and rotating `refresh_token`). Discovery: RFC 8414 well-known before the issuer path, plus `{iss}/.well-known/openid-configuration` (same JSON; Grant is not an OpenID Provider).

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

- ed06fc0: Fix the release workflow Docker matrix expression so GitHub Actions can parse
  `release.yml` and run the release pipeline after merges to `main`.
  - @grantjs/schema@1.3.2

## 1.3.1

### Patch Changes

- 2f5b331: Fix the release workflow Docker matrix expression so GitHub Actions can parse
  `release.yml` and run the release pipeline after merges to `main`.
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

## 1.0.1

### Patch Changes

- 994a631: Add `onMfaRequired` callback to `GrantClientConfig` for REST-side MFA step-up with shared-promise coalescing, so 403 MFA_REQUIRED responses trigger the step-up dialog and transparently retry the request after verification.
