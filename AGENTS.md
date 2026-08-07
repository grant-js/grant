# Grant Platform – Agent Instructions

Multi-tenant RBAC platform. Monorepo: `apps/api`, `apps/web`, `packages/@grantjs/*`.

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

| Symbol                                     | Import from                     | NOT from                                  |
| ------------------------------------------ | ------------------------------- | ----------------------------------------- |
| `createLogger`, `Logger`                   | `@/lib/logger`                  | `@grantjs/logger`                         |
| `HttpException`, `mapDomainToHttp`         | `@/lib/errors`                  | `@grantjs/errors`                         |
| Domain errors (`NotFoundError`, etc.)      | `@/lib/errors`                  | (already re-exports from `@grantjs/core`) |
| `DeleteParams`, `SelectedFields`, `Otp`    | `@/types`                       | `@/services/common`                       |
| `validateInput`, `validateOutput`, schemas | `./common` (within services)    | —                                         |
| `jsonSchema` (REST layer)                  | `@/rest/schemas/common.schemas` | `@/services/common`                       |

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
- In request-scoped code use `context.requestLogger` (or `getRequestLogger(req)`); pass it into handler methods that log so logs include `requestId`.

### Error handling

- `@grantjs/core` defines domain exceptions (`GrantException` hierarchy).
- `@grantjs/errors` provides `HttpException` and `mapDomainToHttp()` for the HTTP layer.
- `apps/api/src/lib/errors/` re-exports both and adds GraphQL error formatting.
- Always use domain-specific errors (e.g. `NotFoundError`, `ValidationError`, `ConfigurationError`) instead of raw `throw new Error(...)`.

## Development workflow (order of work)

When adding or changing features, follow this order. Each step may produce outputs used by the next.

For multi-file features, use the **Agentic SDLC** (story trunk + stacked PRs) — see below and `docs/contributing/agentic-sdlc.md`. Do not accumulate a month of work on one branch for a single mega-PR.

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
   - **Service ports in `@grantjs/core`**: For each new service in `apps/api`, add a matching `I*Service` interface in `packages/@grantjs/core/src/ports/services/` (grouped by domain, e.g. `project.service.port.ts`). Export it from `packages/@grantjs/core/src/ports/services/index.ts`, and if the interface is listed in `packages/@grantjs/core/src/ports/service.port.ts` (backward-compatible barrel), add it there too. Implement the interface on the concrete class; handlers inject the **port** type, not the implementation class.

5. **Web** – `apps/web`
   - Add or update hooks (from operation documents) and feature components. See `.cursor/rules/react-and-web.mdc` when editing web code.

## Agentic SDLC

**SDLC** = Software Development Life Cycle. Grant coordinates work with a standing agent roster; only roles listed on the stack plan are active.

- **Orchestration**: Project Manager (brief, acceptance, gates) + Principal Engineer (stack order, integration, worktrees). Specialists on demand.
- **Merge topology**: Story trunk `feat/<slug>` ← stacked slice PRs → final PR `feat/<slug>` → `main` → release pipeline.
- **Stacking tool**: `gh stack` (`gh extension install github/gh-stack`). Always root the stack on the story trunk: `gh stack init --base feat/<slug> …`. Without `--base` it targets `main` directly and skips gate 4. `gh stack merge` is a human command.
- **Human gates**: (1) story brief, (2) stack plan, (3) stack PRs into trunk, (4) story→main. Agents never self-merge.
- **Review bars**: light (typical stack→trunk), deep (story→main), security-full (auth/tenancy/permissions).
- **Plans**: Multi-file work requires a **stack plan** (ordered reviewable PRs), not a mega-diff plan. Templates: `docs/contributing/templates/`. Active artifacts: `plans/YYYY-MM-DD-<slug>-{brief,stack}.md`.
- **Worktrees**: One git worktree per story when multiple stories run in parallel. Principal Engineer owns create/cleanup. Never two writers in one working tree.
- **Full workflow**: `docs/contributing/agentic-sdlc.md` (includes agents vs skills, multi-vendor skill paths, and optional Cursor packs)
- **Role prompts**: `.cursor/agents/` (Cursor) and `.claude/agents/` (Claude Code subagents) — same roster, kept in sync manually; other harnesses may read either or the SDLC doc.
- **Project skills (required for Grant workflows)**: `add-feature`, `code-review` — same `SKILL.md` content under `.cursor/skills/` and `.claude/skills/` (and Codex’s skills path when used). Skills are verbs, not one-per-role.
- **Plugin packs (optional)**: Compound Engineering and similar Cursor/local packs accelerate brainstorm/plan/work but are **not** in this repo and **not** required to merge. Without them, use templates in `docs/contributing/templates/` + `plans/`. See `docs/contributing/agentic-sdlc.md` § Skills and multi-vendor tooling.

## Testing

- Unit and integration tests can be run with package-level Vitest commands, for example `pnpm --filter grant-api exec vitest run tests/unit/path/to/file.test.ts`.
- **End-to-end tests must be run from the repo root with the e2e wrapper**, not by invoking Vitest directly. Use `pnpm test:e2e` so `scripts/e2e.sh` sets up `.env.test`, starts the Docker e2e stack, runs migrations/seeds, executes the API e2e suite, and tears the stack down.
- To keep the e2e stack up while iterating, use `pnpm test:e2e:up`, then run the API e2e command against the prepared stack, for example `pnpm --filter grant-api test:e2e -- tests/e2e/flows.e2e.test.ts`, and finally `pnpm test:e2e:down`. Use `pnpm test:e2e:run` only for a full e2e run against an already-up stack.
- Do not run `pnpm --filter grant-api test:e2e ...` unless the e2e API, Postgres, and Redis stack is already running and prepared; direct package commands do not perform the environment setup.

## Code style

- TypeScript everywhere; strict mode. Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Use project aliases (`@/`, `@grantjs/*`); avoid deep relative paths.
- Prefer existing patterns: search for similar handlers, services, or components before adding new ones.
- Use `import type` for type-only imports.

### Layer terminology (`apps/api`)

| Term                    | Location                                        | Meaning                                                                                                |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Handler**             | `apps/api/src/handlers/`                        | Transport orchestrators extending `CacheHandler` (GraphQL/REST entry).                                 |
| **Service**             | `apps/api/src/services/*Service`                | Business logic + audit; co-located `*.schemas.ts` for zod validation.                                  |
| **Repository**          | `apps/api/src/repositories/`                    | Database access only.                                                                                  |
| **Lib**                 | `apps/api/src/lib/**/*.lib.ts`                  | Stateless helpers and shared utilities (no `CacheHandler`).                                            |
| **CDM entity**          | `apps/api/src/lib/cdm/entities/*.cdm-entity.ts` | `*CdmEntity` classes implementing `ICdmEntityHandler` — not transport handlers.                        |
| **Project sync job**    | `ProjectSyncJobService`, `project_sync_jobs`    | Async job envelope (`startProjectSync` / `startProjectExport`); public API keeps `ProjectSync*` names. |
| **CDM import / export** | `ProjectImportService`, `ProjectExportService`  | Apply or snapshot CDM payloads; invoked by the worker, not by transport handlers directly.             |

Do **not** name files `*.handler.ts` or classes `*Handler` outside `handlers/`. The core port `ICdmEntityHandler` keeps its name; implementations use `*CdmEntity`.

### Comments and documentation

Prefer self-documenting names, composition, and small extractions over inline commentary.

| Keep                                                                                      | Move to docs or delete                                 |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| GraphQL descriptions (tiered — see `schema.mdc`)                                          | Long orchestration narratives in `.ts` files           |
| Brief notes for non-obvious invariants, security, or races when names cannot express them | Step-by-step phase comments inside functions           |
| Tooling directives (`eslint-disable`, `@ts-expect-error` with reason)                     | Duplicate JSDoc that restates obvious behavior         |
| Generated-file markers                                                                    | File banners when a README already explains the module |
| Minimal JSDoc on exported cross-package ports when types are insufficient                 | Per-field docs on self-explanatory counters or columns |

Contributor docs for CDM: `apps/api/src/lib/cdm/README.md`, `docs/core-concepts/cdm-import-export.md`.

## Where to look

| Layer            | Location                                                     | Rule (when editing) |
| ---------------- | ------------------------------------------------------------ | ------------------- |
| Domain core      | `packages/@grantjs/core`                                     | —                   |
| Schema/types     | `packages/@grantjs/schema`                                   | `schema.mdc`        |
| Database         | `packages/@grantjs/database`                                 | `database.mdc`      |
| Adapter packages | `packages/@grantjs/{cache,storage,email,jobs,logger,errors}` | —                   |
| API app          | `apps/api`                                                   | `api.mdc`           |
| Web app          | `apps/web`                                                   | `react-and-web.mdc` |
| Agentic SDLC     | `docs/contributing/agentic-sdlc.md`, `.cursor/agents/`       | —                   |
