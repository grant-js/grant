# Dependency Inversion Principle (DIP) – Planning

This document evaluates how the API applies the Dependency Inversion Principle today and outlines a plan to apply it more consistently, including moving shared abstractions into `@grantjs/core` so different implementations can be plugged in (e.g. database, cache, email, jobs, storage).

---

## 1. Current State

### 1.1 Abstractions already following DIP (in the API)

These live under `apps/api/src/lib/` with **interfaces** and **factory + adapters**:

| Port        | Interface                              | Factory                           | Implementations                      |
| ----------- | -------------------------------------- | --------------------------------- | ------------------------------------ |
| **Cache**   | `ICacheAdapter`, `IEntityCacheAdapter` | `CacheFactory`                    | In-memory, Redis                     |
| **Email**   | `IEmailService`                        | `EmailFactory` (used in services) | Console, Mailgun, Mailjet, SES, SMTP |
| **Jobs**    | `IJobAdapter`                          | `JobFactory`                      | BullMQ, node-cron                    |
| **Storage** | `IFileStorageService`                  | `StorageFactory`                  | Local, S3                            |

Pattern: the API defines the contract and chooses the implementation at runtime via config. Other apps (e.g. a future worker or CLI) cannot depend on “Grant’s cache contract” without depending on the API package.

### 1.2 Core’s existing DIP pattern

`@grantjs/core` already inverts the dependency for authorization data:

- **Core** defines the port: `GrantService` (in `packages/@grantjs/core/src/types/index.ts`) with `getUserPermissions`, `getUserRoles`, `getUserGroups`, `getUser`.
- **API** implements it: `GrantRepository` (in `apps/api`) implements `GrantService` and is passed into `Grant` at construction.

So: core depends on an abstraction; the API (and its database) is the detail. We want the same pattern for database and other infrastructure.

### 1.3 Database: current coupling

The database is **tightly coupled** to Drizzle and Postgres:

| Coupling point      | Location                            | Detail                                                                                                |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Connection**      | `@grantjs/database` `connection.ts` | `drizzle(postgres(connectionString))`, `PostgresJsDatabase<typeof schema>`, singleton `getDatabase()` |
| **Type**            | Everywhere                          | `DbSchema` = `PostgresJsDatabase<typeof schema>`                                                      |
| **Transaction**     | `transaction-manager.lib.ts`        | `Transaction` = first parameter of `DbSchema['transaction']` callback (Drizzle-specific)              |
| **Repositories**    | `EntityRepository`, all repos       | Accept `DbSchema`, use `drizzle-orm` (`eq`, `and`, `sql`, `query.users.findMany`, etc.)               |
| **Schema / tables** | `@grantjs/database` schemas         | `pgTable`, Drizzle relations, `$inferSelect` / `$inferInsert` model types                             |
| **Services**        | All services                        | Accept `DbSchema` for audit logs and ad-hoc queries                                                   |

So today:

- **Core** does **not** depend on the database; it only depends on `GrantService`.
- **API** and **@grantjs/database** are the only consumers of `DbSchema`; everything (repos, services, handlers, middleware) imports `DbSchema` or schema/table types from `@grantjs/database`.

To apply DIP for the database we need to introduce abstractions that core (or a shared layer) can depend on, and keep Drizzle/Postgres as one possible implementation.

---

## 2. What can move to `@grantjs/core`

Core should own **ports** (interfaces) that define _what_ the platform needs, not _how_ it’s implemented. Implementations stay in the API or in dedicated packages (e.g. `@grantjs/database`).

### 2.1 Low-effort, high-consistency: infrastructure ports

Move **only the interfaces** (and any shared types they need) into core. Implementations and factories stay in the API (or move later to separate packages).

| Port        | Move to core                                                                                                                                 | Stays in API                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Cache**   | `ICacheAdapter`, `IEntityCacheAdapter`, `CacheKey` (if it only depends on `@grantjs/schema` tenant)                                          | Adapters, `CacheFactory`, config types              |
| **Email**   | `IEmailService`, `SendInvitationParams`, `SendOtpParams`, `SendPasswordResetParams`                                                          | Adapters, templates, `EmailFactory`                 |
| **Jobs**    | `IJobAdapter`, `ScheduledJob`, `JobExecutionContext`, `JobResult`, `JobHandler`, `EnqueueJobData` (types from `@grantjs/schema` for `Scope`) | Adapters, `JobFactory`, job registry, concrete jobs |
| **Storage** | `IFileStorageService`, `UploadOptions`, `UploadResult`                                                                                       | Adapters, `StorageFactory`                          |

Benefits:

- Other apps (worker, CLI, future services) can depend on `@grantjs/core` and receive cache/email/jobs/storage via dependency injection.
- API continues to use its existing adapters and factories; they now implement interfaces from core.
- Clear rule: “core = contracts, API (or other packages) = implementations.”

### 2.2 Database: two possible levels

Database is harder because current code is built around Drizzle’s API (query builder, relations, transactions). Two levels of abstraction are useful.

#### Level A: Transaction / connection port (minimal)

**In core:**

- Define a minimal **transaction port** that the rest of the app can use without referencing Drizzle:
  - Example: `ITransactionalConnection` with `runInTransaction<T>(fn: (tx: ITransactionSession) => Promise<T>): Promise<T>`.
  - `ITransactionSession` is intentionally opaque (or a small interface) so core and API don’t depend on Drizzle’s transaction type.

**In API / database package:**

- `TransactionManager` (or a thin wrapper) implements this port by delegating to `DbSchema.transaction` and mapping the Drizzle transaction to `ITransactionSession` (e.g. pass-through if the session is just “run queries with this tx”).
- Repositories and services that need “run in transaction” would depend on `ITransactionalConnection` (or a request-scoped “unit of work”) instead of `DbSchema` for that single concern.

This doesn’t remove Drizzle from repos yet, but it centralizes transaction handling behind an interface and makes it easier to add another implementation later (e.g. a different driver or store).

#### Level B: Repository interfaces (full DIP for data access)

**In core:**

- Define **repository interfaces** for the aggregates that the platform needs, e.g.:
  - `IUsersRepository`: `findById`, `create`, `update`, etc. (domain-focused, not Drizzle-specific).
  - Same idea for roles, permissions, resources, projects, organizations, etc., as needed by core or by “application” code that we want to keep implementation-agnostic.

**In API or `@grantjs/database`:**

- Current repository classes (e.g. `UserRepository` extending `EntityRepository`) implement these interfaces.
- Services and handlers depend on `IUsersRepository` (from core) instead of `DbSchema` or concrete repo classes. Composition root (e.g. `createRepositories(db)`) returns objects that implement the core interfaces.

**Challenge:** `EntityRepository` is a large, Drizzle-centric base (filters, relations, `queryBuilder`, `buildFilterCondition` with `sql`, etc.). Options:

1. **Keep EntityRepository as internal implementation detail**: have `UsersRepository` implement core’s `IUsersRepository` and delegate to the existing Drizzle-based logic. No need to move EntityRepository into core.
2. **Split over time**: introduce `IUsersRepository` in core with a small method set; implement in API. Gradually widen the interface and move more logic behind it, so that eventually “list users with filters” is a method on the interface and the Drizzle-specific code lives only inside the implementation.

Recommendation: start with **Level A** (transaction port) for immediate consistency with DIP, then introduce **Level B** for one or two key aggregates (e.g. users and roles) as a pilot before generalizing to all repositories.

### 2.3 What should _not_ move to core

- **Concrete schema definitions** (tables, columns, relations): they stay in `@grantjs/database` and are Drizzle/Postgres-specific.
- **Model types** derived from Drizzle (`UserModel`, `$inferSelect`, etc.): they stay in the database package or API; core can depend on **domain types** from `@grantjs/schema` (or small interfaces in core) instead.
- **Connection lifecycle** (`initializeDBConnection`, `closeDatabase`, `getDatabase`): remains in `@grantjs/database`; only the _abstraction_ (e.g. transaction port or repository interfaces) lives in core.
- **Factory and adapter implementations**: stay in API or in separate adapter packages; core only defines the interfaces they implement.

---

## 3. Suggested phasing

### Phase 1: Move infrastructure ports to core (cache, email, jobs, storage)

1. In `@grantjs/core`:
   - Add a small **ports** (or **adapters**) area, e.g. `src/ports/` or `src/adapters/`.
   - Define:
     - `ICacheAdapter`, `IEntityCacheAdapter` (and `CacheKey` if it belongs here).
     - `IEmailService` + params types.
     - `IJobAdapter` + job types (using `Scope` from `@grantjs/schema`).
     - `IFileStorageService` + upload options/result.
   - Re-export from `@grantjs/core` so the API and any other consumer can depend on core for contracts only.

2. In the API:
   - Replace local interface definitions with imports from `@grantjs/core`.
   - Keep all adapter implementations and factories in the API; ensure they implement the core interfaces.
   - Update `AppContext` / DI to use the same types (no behavior change).

3. **Outcome**: Single place for “what cache/email/jobs/storage look like”; other apps can depend on core and inject their own implementations.

### Phase 2: Transaction port (database – Level A)

1. In core:
   - Define `ITransactionSession` (opaque or minimal) and `ITransactionalConnection` with `runInTransaction`.
   - Do **not** expose Drizzle or Postgres types from core.

2. In API / database package:
   - Implement `ITransactionalConnection` using `DbSchema.transaction`, mapping Drizzle’s transaction to the core session type (e.g. a thin wrapper that still passes the Drizzle tx where needed).
   - Optionally, introduce a request-scoped “unit of work” that holds both the connection and the current transaction (if any) and inject that into services that need transactions.

3. Use this in one or two flows (e.g. user signup or organization creation) so the pattern is proven before wider adoption.

### Phase 3: Repository interfaces (database – Level B, pilot)

1. In core:
   - Define 1–2 repository interfaces, e.g. `IUsersRepository`, `IRolesRepository`, with methods that match what Grant and the API need (e.g. `findById`, `list`, `create`, `update`). Use domain types / IDs, not Drizzle types.

2. In API:
   - Make existing `UsersRepository` / `RolesRepository` implement these interfaces (adapter pattern).
   - In the composition root, type the returned object as the core interface (e.g. `createRepositories(db).users` typed as `IUsersRepository`).
   - Have services depend on `IUsersRepository` / `IRolesRepository` (from core) instead of concrete classes or `DbSchema` where possible.

3. Expand to more repositories over time and gradually reduce direct `DbSchema` usage in services.

### Phase 4 (optional): Extract adapter packages

- Move Redis/Mailgun/BullMQ/S3/etc. adapters into their own packages (e.g. `@grantjs/cache-redis`, `@grantjs/email-mailgun`) that depend only on `@grantjs/core` (for the port) and their driver. The API then depends on these packages and wires them in. This keeps the API thin and makes adapters reusable across apps.

---

## 4. Dependency direction (target)

- **Core** depends on: `@grantjs/schema` (and possibly minimal shared types). It defines ports (interfaces) and uses them (e.g. `Grant` uses `GrantService`; future code may use `IUsersRepository`, `ITransactionalConnection`, `ICacheAdapter`, etc.). Core does **not** depend on Drizzle, Postgres, or any concrete adapter.
- **API** depends on: `@grantjs/core` (Grant, ports), `@grantjs/database` (connection, schema, Drizzle implementation). API implements the ports (repositories, cache adapters, email adapters, etc.) and wires them at startup.
- **@grantjs/database** can depend on core only if it implements a port defined in core (e.g. `ITransactionalConnection` or, later, repository interfaces). It should not depend on the API.

This keeps “business and contracts” in core and “infrastructure and persistence” in the API and database package, with a clear dependency rule: details depend on abstractions, and abstractions live in core.

---

## 5. Summary

| Area                              | Current                                  | After Phase 1                   | After Phase 2                                | After Phase 3 (pilot)                    | After Phase 5 (handlers/services)              |
| --------------------------------- | ---------------------------------------- | ------------------------------- | -------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Cache / Email / Jobs / Storage    | Interfaces in API                        | Interfaces in core, impl in API | Same                                         | Same                                     | Same                                           |
| Database – connection/transaction | Only Drizzle                             | Same                            | Transaction port in core; handlers use it    | Same                                     | Same                                           |
| Database – repositories           | Concrete repos + DbSchema                | Same                            | Same                                         | 1–2 repo interfaces in core, impl in API | Expand as needed                               |
| Audit                             | AuditService + DbSchema in every service | Same                            | Same                                         | Same                                     | IAuditLogger in core; services use port        |
| Scope resolution                  | CacheHandler + full Services             | Same                            | Same                                         | Same                                     | IScopedIdProvider in core; handlers use port   |
| Handlers                          | Services + DbSchema + cache              | Same                            | ITransactionalConnection instead of DbSchema | Same                                     | IScopedIdProvider + I\*Service interfaces      |
| Services                          | Repositories + DbSchema (audit)          | Same                            | Same                                         | Repository interfaces                    | + IAuditLogger, implement I\*Service from core |

Applying DIP consistently means: **move contracts to `@grantjs/core`**, keep **implementations in the API and `@grantjs/database`**, and **inject implementations at the composition root** so you can plug in different implementations (e.g. another database or cache) without changing core or business logic.

---

## 6. Handlers, services, and application-layer decoupling

Beyond infrastructure and database, there are clear opportunities to decouple **handlers** and **services** from concrete implementations so core (or a shared application layer) can depend on abstractions and the API remains the detail.

### 6.1 Current coupling: handlers

**Handlers** (e.g. `UserHandler`, `RoleHandler`) today depend on:

- **Entire `Services` object** – so every handler can call any service (e.g. `CacheHandler` needs many services for `getScopedUserIds`, `getScopedRoleIds`, etc.).
- **`DbSchema`** – only for `TransactionManager.withTransaction(this.db, ...)` when running multi-step operations in a transaction.
- **`IEntityCacheAdapter`** – for scope-ID caching and auth result caching.

GraphQL resolvers and REST routes call `context.handlers.users.getUsers(...)` etc., so the delivery layer (resolvers/routes) already talks to handlers, not directly to services. The coupling problem is inside the API: handlers are tied to the concrete `Services` type and `DbSchema`.

**Decoupling opportunities:**

| Concern                    | Current                                                                                                                                                                    | Opportunity                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transaction**            | Handler receives `DbSchema`, calls `TransactionManager.withTransaction(this.db, ...)`                                                                                      | Handlers receive `ITransactionalConnection` (Phase 2) instead of `DbSchema`. No Drizzle type in handler signatures.                                                                                                                                                                                                                                                        |
| **Scope → IDs**            | `CacheHandler` calls many services (accountProjects, organizationProjects, projectRoles, userRoles, …) and cache to implement `getScopedUserIds`, `getScopedRoleIds`, etc. | Define in **core**: `IScopedIdProvider` with methods like `getScopedUserIds(scope)`, `getScopedRoleIds(scope)`, … returning `Promise<string[]>`. API implements it (current CacheHandler logic). Handlers then depend on `IScopedIdProvider` for “resolve scope to IDs” and no longer need the full `Services` bag for that.                                               |
| **Application operations** | Handlers call `this.services.users.getUsers(...)`, `this.services.users.createUser(...)`, etc.                                                                             | Define in **core**: application service interfaces, e.g. `IUserService` (getUsers, createUser, updateUser, deleteUser, …) with inputs/outputs from `@grantjs/schema`. API’s `UserService` implements `IUserService`. Handlers receive only the interfaces they need (e.g. `IUserService`, `IOrganizationService`). Resolvers/other apps can depend on the same interfaces. |

After this, a handler’s constructor might look like: `(scopeResolver: IScopedIdProvider, userService: IUserService, txConnection: ITransactionalConnection, cache: IEntityCacheAdapter)` instead of `(cache, services, db)`. The handler no longer knows about the full service bag or Drizzle.

### 6.2 Current coupling: services

**Services** (e.g. `UserService`, `AccountProjectApiKeyService`) today depend on:

- **Entire `Repositories` object** – so each service uses one or more repositories (e.g. `repositories.userRepository`, `repositories.accountRoleRepository`).
- **`DbSchema`** – for audit logging: every entity service extends `AuditService`, which takes a Drizzle table reference and `db` and calls `db.insert(this.auditLogsTable).values(...)`.
- **`GrantAuth | null** – for current user and scope when writing audit logs.

So services are coupled to: concrete repository types, Drizzle (for audit), and the shape of `Repositories`.

**Decoupling opportunities:**

| Concern                | Current                                                                                                                                                                                    | Opportunity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Repositories**       | Services take `Repositories` and call `repositories.userRepository`, etc.                                                                                                                  | Once **repository interfaces** exist in core (Phase 3), services take `IUsersRepository`, `IRolesRepository`, etc. (or a typed bag of interfaces) instead of the concrete `Repositories`. Implementations stay in the API.                                                                                                                                                                                                                                                                        |
| **Audit logging**      | `AuditService` is an abstract base that takes `auditLogsTable` (Drizzle table) and `db: DbSchema`, and does `db.insert(this.auditLogsTable).values(...)`. Every entity service extends it. | Define in **core**: `IAuditLogger` with methods `logCreate`, `logUpdate`, `logSoftDelete`, `logHardDelete` (entityId, action, oldValues, newValues, metadata). API implements it (e.g. `DrizzleAuditLogger` that writes to the appropriate audit table). Services receive an `IAuditLogger` (or a factory that returns one per entity type) instead of extending `AuditService` with a table and `db`. Then services no longer depend on `DbSchema` for audit—only the audit implementation does. |
| **Service interfaces** | No interface; resolvers/handlers call concrete `UserService`, etc.                                                                                                                         | Define in **core**: `IUserService`, `IOrganizationService`, `IAccountProjectApiKeyService`, … with the public methods and domain types. API’s concrete services implement these. Handlers and (if desired) GraphQL layer depend on the interfaces. Enables testing with mocks and reuse (e.g. CLI or worker calling the same contracts).                                                                                                                                                          |

**Audit in more detail:** Today `AuditService` is both a _contract_ (logCreate, logUpdate, …) and a _Drizzle-based implementation_. Splitting them gives: core defines `IAuditLogger`; API has `DrizzleAuditLogger(auditLogsTable, db)` implementing it; each entity service gets an `IAuditLogger` instance (or a scoped logger for that entity). No `DbSchema` or Drizzle table type in the service’s constructor beyond the composition root.

### 6.3 Scope resolution as a port (`IScopedIdProvider`)

The “resolve scope to list of IDs” behavior is a clear domain concept: _within this scope, which users/roles/groups/permissions/resources/tags/projects/apiKeys are visible?_ The current implementation (cache + many service calls) is infrastructure. Core can define the **port** without knowing about cache or repositories:

- **In core:** `IScopedIdProvider` with methods such as:
  - `getScopedUserIds(scope): Promise<string[]>`
  - `getScopedRoleIds(scope): Promise<string[]>`
  - `getScopedGroupIds(scope): Promise<string[]>`
  - `getScopedPermissionIds(scope): Promise<string[]>`
  - `getScopedResourceIds(scope): Promise<string[]>`
  - `getScopedTagIds(scope): Promise<string[]>`
  - `getScopedProjectIds(scope): Promise<string[]>`
  - `getScopedApiKeyIds(scope): Promise<string[]>`
  - (and optionally cache-invalidation methods like `invalidateUsersCacheForScope(scope)` if we want those in the contract)

- **In API:** Current `CacheHandler` logic (or a dedicated `ScopedIdProvider` class) implements `IScopedIdProvider` using cache and the existing services/repositories. Handlers that extend a base only need `IScopedIdProvider` for scope resolution, plus the specific application service interfaces they call.

This keeps “what scope resolution means” (the contract) in core and “how we resolve it” (cache + DB) in the API.

### 6.4 Use-case-style ports (optional, more granular)

Instead of (or in addition to) one interface per _entity service_ (IUserService, IRoleService, …), you can define one interface per **operation** (use case), e.g.:

- `ICreateUserUseCase { run(input: CreateUserInput): Promise<User> }`
- `IGetUsersUseCase { run(params: QueryUsersParams): Promise<UserPage> }`

Handlers would then depend on these small interfaces. Benefits: very narrow contracts, easy to mock, CQRS-friendly. Tradeoff: more interfaces and more classes (one per use case). For Grant, starting with **service interfaces** (IUserService, etc.) is likely enough; use-case interfaces can be introduced later for specific flows where you want maximum isolation or reuse (e.g. “create organization” used by both REST and a CLI).

### 6.5 Suggested phasing for handlers and services

| Phase                  | Focus              | Outcome                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 2** (existing) | Transaction port   | Handlers receive `ITransactionalConnection` instead of `DbSchema`.                                                                                                                                                                                          |
| **Phase 5a**           | Audit port         | Core: `IAuditLogger`. API: `DrizzleAuditLogger`. Services take `IAuditLogger` (or a factory); no longer extend `AuditService` with a table + db.                                                                                                            |
| **Phase 5b**           | Scope port         | Core: `IScopedIdProvider`. API: implement with current CacheHandler logic. Handlers (and base CacheHandler) depend on `IScopedIdProvider` instead of full `Services` for scope resolution.                                                                  |
| **Phase 5c**           | Service interfaces | Core: `IUserService`, `IRolesService`, … (and optionally others as needed). API: existing services implement them. Handlers and context receive interfaces instead of concrete `Services`. Start with 1–2 domains (e.g. users, organizations), then expand. |

Execution order: Phase 2 (transaction) first, then 5a (audit) so services can drop `DbSchema` for audit; then 5b (scope) so handlers can drop the full `Services` bag for scope resolution; then 5c (service interfaces) so handlers and resolvers depend on narrow contracts. That way core stays free of Drizzle and of the concrete service/repository types, while the API remains the single place that wires implementations.

### 6.6 Summary: handlers and services

| Layer                  | Current coupling                                           | After decoupling                                                                                                 |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Handlers**           | `Services`, `DbSchema`, `IEntityCacheAdapter`              | `IScopedIdProvider`, `IUserService` / … (only what they need), `ITransactionalConnection`, `IEntityCacheAdapter` |
| **Services**           | `Repositories` (concrete), `DbSchema` (audit), `GrantAuth` | Repository interfaces (Phase 3), `IAuditLogger`, `GrantAuth`; implement `IUserService`, etc. from core           |
| **Resolvers / routes** | `context.handlers.*`                                       | Unchanged; handlers remain the entry point but now satisfy interfaces from core                                  |

Core then defines: **infrastructure ports** (cache, email, jobs, storage), **transaction port**, **repository interfaces** (pilot then expand), **audit port**, **scope port**, and **application service interfaces**. The API implements all of them and composes them at startup and per request. That gives consistent dependency inversion from delivery (handlers) and application (services) down to infrastructure and persistence.
