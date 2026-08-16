---
'@grantjs/schema': patch
---

Code quality pass 5: stop re-emitting schema types, and remove dead surface.

`codegen.ts` ran the `typescript` plugin alongside `typescript-resolvers`, so `src/generated/resolvers.ts` declared a second copy of all 464 schema type names already owned by `schema-types.ts`. It now imports them instead, taking the file from 7,347 to 3,548 lines. `src/index.ts`'s hand-curated 23-name resolver export list existed only to dodge the resulting identifier collision and is now a normal re-export, so all 115 `*Resolvers` types are available rather than 23.

Removed from the public surface, none of which had a consumer in this repo:

- `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES` — duplicates of `@grantjs/database` constants that are also backed by SQL `CHECK` constraints
- `AUDIENCE_PRIMITIVES` and `EVENT_DELIVERY_CLASSES` — now union types (`AudiencePrimitive`, `EventDeliveryClass` are unchanged); the runtime arrays were unused
- `AudienceRule`, `EventCatalogEntry` — internal to the event catalog

Six unreferenced GraphQL declarations and three superseded operation documents were also removed; types reachable from `Query`/`Mutation` are unchanged at 207.
