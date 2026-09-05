# grant-web

## 1.6.2

### Patch Changes

- d5b2b05: Fix three deadlocks in the webhook UI that made the feature unusable.

  The detail page crashed with React error #185 (maximum update depth exceeded)
  because `useWebhookDeliveries` returned a new `deliveries` array and a new
  `refetch` closure on every render, and both are used as effect dependencies that
  write into a store — so each store update re-rendered the component that owned
  them. The actions menu could never be opened: permissions are fetched only once
  the menu has been opened, and both the empty-actions guard and the `isLoading`
  expression removed or disabled the trigger before that could happen, so rotating
  a signing secret was unreachable from any view.
  - @grantjs/schema@1.6.2
  - @grantjs/client@1.6.2
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.6.1

### Patch Changes

- @grantjs/schema@1.6.1
- @grantjs/client@1.6.1
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.6.0

### Patch Changes

- @grantjs/schema@1.6.0
- @grantjs/client@1.6.0
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.5.5

### Patch Changes

- @grantjs/schema@1.5.5
- @grantjs/client@1.5.5
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.5.4

### Patch Changes

- 9caf929: Fix grant-web Docker startup by shipping @swc/helpers ESM in the Next standalone bundle (next 16.3.2).
  - @grantjs/schema@1.5.4
  - @grantjs/client@1.5.4
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.5.3

### Patch Changes

- Updated dependencies [178dd71]
  - @grantjs/schema@1.5.3
  - @grantjs/client@1.5.3
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

## 1.5.2

### Patch Changes

- @grantjs/schema@1.5.2
- @grantjs/client@1.5.2
- @grantjs/core@1.0.0
- @grantjs/constants@1.0.0

## 1.5.1

### Patch Changes

- a720d40: Align webhook create with full-page create viewers and route webhook/notification UI data through Apollo.

  Replace the create dialog with a `/webhooks/new` create viewer (shared events DataTable for create and edit), polish the one-time signing-secret dialog, and migrate webhooks and notifications hooks off REST so idle 401s refresh via Apollo like the rest of the dashboard.
  - @grantjs/schema@1.5.1
  - @grantjs/client@1.5.1
  - @grantjs/core@1.0.0
  - @grantjs/constants@1.0.0

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
