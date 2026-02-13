---
name: add-feature
description: Scaffold a new feature end-to-end across all layers (database, schema, API, web). Use when the user asks to add a new entity, CRUD operation, feature module, or vertical slice.
---

# Add Feature

Checklist-driven workflow for adding a full vertical slice. Copy the checklist below and track progress. Use `groups` as the reference implementation throughout.

## Progress checklist

```
Feature: [entity name]
- [ ] 1. Database schema and migration
- [ ] 2. Schema / API contracts and codegen
- [ ] 3. GraphQL resolvers
- [ ] 4. REST routes, zod schemas, OpenAPI spec
- [ ] 5. Handler
- [ ] 6. Service and service schemas
- [ ] 7. Repository
- [ ] 8. Wire handler/service/repo into context
- [ ] 9. Web hooks (query + mutations + cache)
- [ ] 10. Web feature module (components)
- [ ] 11. i18n translations
- [ ] 12. Verification (types, lint, tests)
```

## Step details

### 1. Database (`packages/@grantjs/database`)

- Add or update Drizzle schema in `src/schemas/`. Define table, columns, and relationships.
- Reference: existing schemas in `src/schemas/`.
- Run `pnpm --filter @grantjs/database db:generate` → `db:migrate` → `db:seed` if needed.

### 2. Schema / API contracts (`packages/@grantjs/schema`)

- Add entity type, enums, page type, input types (Create/Update), query args, and mutation args.
- Add operation documents for consumers (queries + mutations).
- Run `pnpm --filter @grantjs/schema generate`.
- These generated types are used in **every** subsequent step.

### 3. GraphQL resolvers (`apps/api/src/graphql/resolvers`)

- Create `<entity>/queries/get-<entities>.resolver.ts` and mutation resolvers.
- Each resolver extracts args + `requestedFields` and calls `context.handlers.<entity>.<method>()`.
- Reference: `groups/queries/get-groups.resolver.ts`, `groups/mutations/create-group.resolver.ts`.
- Register in `queries.ts` / `mutations.ts`.

### 4. REST routes (`apps/api/src/rest`)

- **Routes**: `routes/<entities>.routes.ts` — map HTTP verbs to handler calls; use `validate()` middleware with zod schemas; use `authorizeRestRoute()` and `requireEmailVerificationRest()`.
- **Zod schemas**: `schemas/<entities>.schemas.ts` — request validation schemas.
- **OpenAPI**: `openapi/<entities>.openapi.ts` — must stay in sync with routes and schemas.
- Reference: `routes/groups.routes.ts`, `schemas/groups.schemas.ts`, `openapi/groups.openapi.ts`.

### 5. Handler (`apps/api/src/handlers`)

- Extend `CacheHandler`. Constructor receives `cache`, `services`, `db`.
- Query methods: scope IDs via cache, delegate to services, return page result.
- Mutation methods: wrap in `TransactionManager.withTransaction()`, orchestrate services, update cache.
- Args: use generated types from `@grantjs/schema` (e.g. `QueryGroupsArgs & SelectedFields<Group>`).
- **Never access repositories directly.**
- Reference: `groups.handler.ts`.

### 6. Service (`apps/api/src/services`)

- Extend `AuditService`. Constructor receives `repositories`, `user`, `db`.
- Validate input/output with zod: `validateInput()`, `validateOutput()`.
- Log mutations: `logCreate()`, `logUpdate()`, `logSoftDelete()`, `logHardDelete()`.
- Args: omit scope (e.g. `Omit<QueryGroupsArgs, 'scope'> & SelectedFields<Group>`).
- Only access **domain-related repositories**. Never query DB directly.
- Reference: `groups.service.ts`, `groups.schemas.ts`.

### 7. Repository (`apps/api/src/repositories`)

- Extend `EntityRepository` (or `PivotRepository` for join tables).
- Set `table`, `schemaName`, `searchFields`, `defaultSortField`, `relations`.
- Only use **domain-related schemas** from `@grantjs/database`.
- Reference: `organizations.repository.ts`.

### 8. Wire into context

- Register the handler in the handlers factory, service in the services factory, and repository in the repositories factory so they're available via `context.handlers.<entity>`.

### 9. Web hooks (`apps/web/hooks/<entity>`)

- `use-<entities>.ts` — query hook using `useQuery` + generated `Get<Entities>Document` from `@grantjs/schema`.
- `use-<entity>-mutations.ts` — mutation hooks using `useMutation` + generated mutation documents.
- `cache.ts` — cache key helpers.
- `index.ts` — re-exports.
- Reference: `hooks/groups/`.

### 10. Web feature module (`apps/web/components/features/<entity>`)

Follow the pattern in `components/features/groups/`:

- `<entity>-toolbar.tsx` — refresh, search, sort, limit, view switcher, create action.
- `<entity>-viewer.tsx` — orchestrates card/table views, loading, empty state.
- `<entity>-cards.tsx` / `<entity>-table.tsx` — card and table views.
- `<entity>-card-skeleton.tsx` — loading skeleton.
- `<entity>-pagination.tsx` — pagination.
- `<entity>-search.tsx`, `<entity>-sorter.tsx`, `<entity>-limit.tsx`, `<entity>-view-switcher.tsx`.
- `<entity>-create-dialog.tsx`, `<entity>-edit-dialog.tsx`, `<entity>-delete-dialog.tsx`.
- `<entity>-actions.tsx` — row-level actions.
- `<entity>-types.ts` — local types if needed.
- `index.ts` — re-exports.

### 11. i18n (`apps/web/i18n`)

- Add translation keys for all user-facing strings (labels, placeholders, messages, errors).

### 12. Verification

- `pnpm type-check` — no type errors.
- `pnpm lint` — no lint errors.
- `pnpm test` — existing tests still pass.
- Confirm OpenAPI spec is in sync with REST routes.

## Notes

- Not every feature requires all steps (e.g. a new query on an existing entity may skip database/schema).
- Ask the user to clarify scope before starting.
