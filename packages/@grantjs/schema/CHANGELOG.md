# @grantjs/schema

## 1.5.3

### Patch Changes

- 178dd71: Code quality pass 5: stop re-emitting schema types, and remove dead surface.

  `codegen.ts` ran the `typescript` plugin alongside `typescript-resolvers`, so `src/generated/resolvers.ts` declared a second copy of all 464 schema type names already owned by `schema-types.ts`. It now imports them instead, taking the file from 7,347 to 3,548 lines. `src/index.ts`'s hand-curated 23-name resolver export list existed only to dodge the resulting identifier collision and is now a normal re-export, so all 115 `*Resolvers` types are available rather than 23.

  Removed from the public surface, none of which had a consumer in this repo:

  - `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES` — duplicates of `@grantjs/database` constants that are also backed by SQL `CHECK` constraints
  - `AUDIENCE_PRIMITIVES` and `EVENT_DELIVERY_CLASSES` — now union types (`AudiencePrimitive`, `EventDeliveryClass` are unchanged); the runtime arrays were unused
  - `AudienceRule`, `EventCatalogEntry` — internal to the event catalog

  Six unreferenced GraphQL declarations and three superseded operation documents were also removed; types reachable from `Query`/`Mutation` are unchanged at 207.

## 1.5.2

## 1.5.1

## 1.5.0

### Minor Changes

- c515e3e: Add a domain-event backbone with project webhooks and in-app notifications.

  Services publish catalogued events into a transactional outbox that drives signed webhook delivery and preference-aware notifications. The release covers IAM CRUD and assignment events, API key rotate (`api_key.rotated`), CDM import event suppression with `project_sync.completed` / `project_sync.failed` summaries, and dashboard UI for subscriptions, deliveries, and the notification center.

## 1.4.2

## 1.4.1

### Patch Changes

- 4fcca1d: Separate shareable organization invitation links from email-delivered verification proof so copied invitation links cannot auto-verify an email address.

## 1.4.0

### Minor Changes

- fd61e91: Add CDM email identity imports for project sync jobs.

  CDM users with `findBy: email` now resolve through the global email authentication catalog, creating an unverified passwordless email authentication method when needed. Project OAuth email magic-link proof verifies imported email methods, and the docs/schema now describe the global identity semantics.

## 1.3.3

## 1.3.2

## 1.3.1

## 1.3.0

## 1.2.0

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

### Patch Changes

- 6abd436: Skip `su-exec` in the API Docker entrypoint when the container already runs as a non-root user, fixing startup on Kubernetes with `securityContext.runAsUser`.

## 1.1.3

### Patch Changes

- 8c9af41: Skip storage directory chown in the API Docker entrypoint when the container is not running as root, so Kubernetes deployments with `readOnlyRootFilesystem` and `securityContext.runAsUser` can start successfully.

## 1.1.2

### Patch Changes

- 01e0ed1: Fix GraphQL codegen duplicate schema types by splitting `schema-types` and operation outputs. Compile the API for production Docker images (replace `tsx` runtime), align REST routes and web hooks with generated types, and fix demo storage volume permissions via entrypoint.

## 1.1.1

## 1.1.0

## 1.0.0

Initial public release of GraphQL schema and generated TypeScript types.
