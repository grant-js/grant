# grant-web

## 1.5.0

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

### Patch Changes

- Updated dependencies [c515e3e]
  - @grantjs/schema@1.5.0
  - @grantjs/client@1.5.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.4.2

### Patch Changes

- @grantjs/schema@1.4.2
- @grantjs/client@1.4.2
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.4.1

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.
- Updated dependencies [4fcca1d]
  - @grantjs/schema@1.4.1
  - @grantjs/client@1.4.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.4.0

### Patch Changes

- Updated dependencies [fd61e91]
  - @grantjs/schema@1.4.0
  - @grantjs/client@1.4.0
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.3.3

### Patch Changes

- @grantjs/schema@1.3.3
- @grantjs/client@1.3.3
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.3.2

### Patch Changes

- ed06fc0: Improve detail page loading states with skeleton placeholders, hide native search clear
  controls, and fix project app update validation for existing sign-up and primary tag values.
- Updated dependencies [ed06fc0]
  - @grantjs/client@1.3.2
  - @grantjs/schema@1.3.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.3.1

### Patch Changes

- Updated dependencies [2f5b331]
  - @grantjs/client@1.3.1
  - @grantjs/schema@1.3.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.3.0

### Patch Changes

- @grantjs/schema@1.3.0
- @grantjs/client@1.3.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.2.0

### Patch Changes

- @grantjs/schema@1.2.0
- @grantjs/client@1.2.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.7

### Patch Changes

- @grantjs/schema@1.1.7
- @grantjs/client@1.1.7
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.6

### Patch Changes

- @grantjs/schema@1.1.6
- @grantjs/client@1.1.6
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.5

### Patch Changes

- @grantjs/schema@1.1.5
- @grantjs/client@1.1.5
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.4

### Patch Changes

- Updated dependencies [6abd436]
  - @grantjs/schema@1.1.4
  - @grantjs/client@1.1.4
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [8c9af41]
  - @grantjs/schema@1.1.3
  - @grantjs/client@1.1.3
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.1.2

### Patch Changes

- Updated dependencies [01e0ed1]
  - @grantjs/schema@1.1.2
  - @grantjs/client@1.1.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.1.1

### Patch Changes

- @grantjs/schema@1.1.1
- @grantjs/client@1.1.1
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.1.0

### Patch Changes

- @grantjs/schema@1.1.0
- @grantjs/client@1.1.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0
