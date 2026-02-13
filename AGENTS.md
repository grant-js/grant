# Grant Platform – Agent Instructions

Multi-tenant RBAC/ACL platform. Monorepo: `apps/api`, `apps/web`, `packages/@grantjs/*`.

## API surface

- **REST and GraphQL** are both supported. REST is integrated with **OpenAPI** and must stay in sync.
- **Schema and TypeScript types are centralized** via codegen in `@grantjs/schema`. Those types are used across REST routes, GraphQL resolvers, handlers, services, and repositories. Do not redefine or duplicate them.

## Development workflow (order of work)

When adding or changing features, follow this order. Each step may produce outputs used by the next.

1. **Development environment**
   - Ensure containers are up: see `docker-compose.yml`; start with `docker compose up -d` if needed.
   - Install/update deps: `pnpm install`.

2. **Database** – `packages/@grantjs/database`
   - Define or update Drizzle schemas and relationships.
   - Generate migrations: `pnpm --filter @grantjs/database db:generate` (no output if nothing changed).
   - Run migrations: `pnpm --filter @grantjs/database db:migrate`.
   - Seed (roles/groups/permissions/system user/signing-key): `pnpm --filter @grantjs/database db:seed`.

3. **Schema / API contracts** – `packages/@grantjs/schema`
   - Model domain entities, enums, queries, and mutations.
   - Define operation documents for consumers.
   - Generate schema and types: `pnpm --filter @grantjs/schema generate`.

4. **API** – `apps/api`
   - Add or update GraphQL resolvers and REST routes; both use types from `@grantjs/schema` and map to handlers. See `.cursor/rules/api.mdc` when editing API code.

5. **Web** – `apps/web`
   - Add or update hooks (from operation documents) and feature components. See `.cursor/rules/react-and-web.mdc` when editing web code.

## Code style

- TypeScript everywhere; strict mode. Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Use project aliases (`@/`, `@grantjs/*`); prefer existing patterns and shared errors before adding new ones.

## Where to look

| Layer      | Location                     | Rule (when editing) |
| ---------- | ---------------------------- | ------------------- |
| Database   | `packages/@grantjs/database` | `database.mdc`      |
| Schema/API | `packages/@grantjs/schema`   | `schema.mdc`        |
| API app    | `apps/api`                   | `api.mdc`           |
| Web app    | `apps/web`                   | `react-and-web.mdc` |
