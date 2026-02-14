# Grant Platform – Agent Instructions

Multi-tenant RBAC/ACL platform. Monorepo: `apps/api`, `apps/web`, `packages/@grantjs/*`.

## API surface

- **REST and GraphQL** are both supported. REST is integrated with **OpenAPI** and must stay in sync.
- **Schema and TypeScript types are centralized** via codegen in `@grantjs/schema`. Those types are used across REST routes, GraphQL resolvers, handlers, services, and repositories. Do not redefine or duplicate them.

## Architecture – Dependency Inversion and Layering

The project follows hexagonal architecture (ports and adapters). Understand and preserve these constraints:

### Package dependency graph (DAG — no cycles allowed)

```
@grantjs/schema          (codegen types, no deps)
    └── @grantjs/core    (domain ports, interfaces, exceptions)
            ├── @grantjs/constants
            ├── @grantjs/database
            ├── @grantjs/logger    (Pino adapter)
            ├── @grantjs/errors    (HTTP adapter)
            ├── @grantjs/cache     (Redis/memory adapters)
            ├── @grantjs/storage   (S3/local adapters)
            ├── @grantjs/email     (SMTP/SES/Mailgun/etc.)
            └── @grantjs/jobs      (node-cron/BullMQ adapters)
```

- **`@grantjs/core`** defines domain ports (`ILogger`, `ILoggerFactory`, `ICacheAdapter`, `IStorageAdapter`, `IEmailAdapter`, `IJobAdapter`) and a rich exception hierarchy (`GrantException` → `NotFoundError`, `BadRequestError`, `AuthenticationError`, `AuthorizationError`, `ConflictError`, `ConfigurationError`, `ValidationError`).
- **Adapter packages** (`cache`, `storage`, `email`, `jobs`, `logger`, `errors`) implement core ports. They accept `ILogger` (or `ILoggerFactory`) via constructor injection or factory — they must **never** import `@grantjs/logger` directly.
- **`@grantjs/database`** accepts an optional `ILogger` via `DatabaseConfig.logger`.
- Packages must use `@grantjs/*` aliases for cross-package imports (never relative `../../../` paths).

### API app layer boundaries (`apps/api`)

```
Transport (GraphQL resolvers, REST routes)
    → Handlers  → Services  → Repositories  → Database
```

**Hard rules:**
- Handlers never import repositories; they go through services.
- Repositories never import services or handlers.
- REST/GraphQL resolvers never import repositories; they call handlers only.
- Middleware (`context.middleware.ts`, `lib/app-context.lib.ts`) is the **composition root** — the only place where handlers, services, and repositories are wired together.

### Import discipline (within `apps/api/src/`)

| Symbol | Import from | NOT from |
|--------|-------------|----------|
| `createLogger`, `Logger` | `@/lib/logger` | `@grantjs/logger` |
| `HttpException`, `mapDomainToHttp` | `@/lib/errors` | `@grantjs/errors` |
| Domain errors (`NotFoundError`, etc.) | `@/lib/errors` | (already re-exports from `@grantjs/core`) |
| `DeleteParams`, `SelectedFields`, `Otp` | `@/types` | `@/services/common` |
| `validateInput`, `validateOutput`, schemas | `./common` (within services) | — |
| `jsonSchema` (REST layer) | `@/rest/schemas/common.schemas` | `@/services/common` |

### Configuration

- All magic numbers and external URLs live in `apps/api/src/config/env.config.ts`, env-overridable with sensible defaults.
- Adapter packages receive config via constructor/factory params — they never read env vars directly.
- OpenAPI server URLs are derived from `APP_CONFIG.url` and `SWAGGER_CONFIG.productionUrl`.

### Logging

- `@grantjs/core` defines `ILogger` and `ILoggerFactory` ports.
- `@grantjs/logger` provides the Pino implementation (`PinoLoggerFactory`).
- `apps/api/src/lib/logger/` is the centralized re-export layer; it also exports a `loggerFactory` singleton.
- Adapter packages accept `ILoggerFactory` in their factory functions and create scoped loggers internally (with a no-op fallback when no factory is provided).
- Never use `console.log/warn/error` in API source or runtime adapter code; use the structured logger.

### Error handling

- `@grantjs/core` defines domain exceptions (`GrantException` hierarchy).
- `@grantjs/errors` provides `HttpException` and `mapDomainToHttp()` for the HTTP layer.
- `apps/api/src/lib/errors/` re-exports both and adds GraphQL error formatting.
- Always use domain-specific errors (e.g. `NotFoundError`, `ValidationError`, `ConfigurationError`) instead of raw `throw new Error(...)`.

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
- Use project aliases (`@/`, `@grantjs/*`); avoid deep relative paths.
- Prefer existing patterns: search for similar handlers, services, or components before adding new ones.
- Use `import type` for type-only imports.

## Where to look

| Layer | Location | Rule (when editing) |
|-------|----------|---------------------|
| Domain core | `packages/@grantjs/core` | — |
| Schema/types | `packages/@grantjs/schema` | `schema.mdc` |
| Database | `packages/@grantjs/database` | `database.mdc` |
| Adapter packages | `packages/@grantjs/{cache,storage,email,jobs,logger,errors}` | — |
| API app | `apps/api` | `api.mdc` |
| Web app | `apps/web` | `react-and-web.mdc` |
