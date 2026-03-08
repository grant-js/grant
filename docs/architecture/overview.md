---
title: Architecture Overview
description: System design, package structure, and request lifecycle of the Grant Platform
---

# Architecture Overview

Grant is a multi-tenant RBAC platform organized as a TypeScript monorepo. It follows hexagonal architecture (ports and adapters) with strict layer boundaries and dependency inversion across packages.

## System Overview

```bmermaid
graph LR
    subgraph Clients
        Web["Web Dashboard<br/><small>Next.js · Apollo Client</small>"]
        App["Your Application<br/><small>@grantjs/client · @grantjs/server</small>"]
    end

    API["<b>Grant API</b><br/>GraphQL · REST / OpenAPI"]

    PG[("PostgreSQL")]
    Redis[("Redis")]
    Store[("Object Storage<br/><small>S3 / Local</small>")]

    Web -->|GraphQL| API
    App -->|"GraphQL / REST"| API
    API --> PG
    API -.-> Redis
    API -.-> Store
```

The platform ships two deployable applications and a set of shared packages:

| Component          | Description                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Grant API**      | Express server exposing both a GraphQL API (Apollo Server) and a REST API with OpenAPI / Swagger documentation |
| **Web Dashboard**  | Next.js 15 (App Router) admin interface with i18n and permission-aware UI                                      |
| **PostgreSQL**     | Primary data store with Row-Level Security for tenant isolation                                                |
| **Redis**          | Optional — caching, session storage, and job queues (BullMQ)                                                   |
| **Object Storage** | Optional — file and image uploads via S3-compatible storage or local filesystem                                |

## Monorepo Packages

All shared code lives under `packages/@grantjs`. The dependency graph is a strict DAG — no circular imports are allowed.

| Package       | Role                                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**    | GraphQL schema definitions, operation documents, and generated TypeScript types. Single source of truth for API contracts — types are imported from here, never redefined.                                                                                  |
| **Core**      | Domain ports (`ILogger`, `ICacheAdapter`, `IStorageAdapter`, `IEmailAdapter`, `IJobAdapter`), the exception hierarchy (`GrantException` → `NotFoundError`, `ValidationError`, …), and the RBAC engine (`Grant`, `PermissionChecker`, `ConditionEvaluator`). |
| **Database**  | Drizzle ORM schemas, relationships, migrations, and seed scripts. Accepts an optional `ILogger` via config.                                                                                                                                                 |
| **Constants** | Canonical permission, role, and group definitions used by the database seeder and the authorization layer.                                                                                                                                                  |
| **Logger**    | Pino-based implementation of `ILoggerFactory` / `ILogger` from core.                                                                                                                                                                                        |
| **Errors**    | `HttpException` and `mapDomainToHttp()` — maps domain exceptions to HTTP status codes for the transport layer.                                                                                                                                              |
| **Cache**     | Memory and Redis cache adapters implementing `ICacheAdapter`.                                                                                                                                                                                               |
| **Storage**   | Local filesystem and S3 adapters implementing `IFileStorageService`.                                                                                                                                                                                        |
| **Email**     | SMTP, SES, Mailgun, Mailjet, and console adapters implementing `IEmailAdapter`.                                                                                                                                                                             |
| **Jobs**      | node-cron and BullMQ adapters implementing `IJobAdapter`.                                                                                                                                                                                                   |
| **Client**    | Browser SDK — React hooks and components for permission-based UI rendering.                                                                                                                                                                                 |
| **Server**    | Server SDK — middleware guards for Express, Fastify, NestJS, and Next.js.                                                                                                                                                                                   |
| **CLI**       | CLI tool for setup, authentication, and typings generation for `@grantjs/server`.                                                                                                                                                                           |

## API Request Lifecycle

Every request — GraphQL or REST — flows through the same layered pipeline:

```bmermaid diagram-narrow
flowchart TB
    Req([HTTP Request]) --> MW["<b>Middleware</b><br/><small>Authentication · Context creation · RLS setup</small>"]
    MW --> Transport

    subgraph Transport["Transport Layer"]
        GQL["GraphQL Resolver"]
        REST["REST Route"]
    end

    Transport -->|"RBAC guard"| Handler["<b>Handler</b><br/><small>Orchestration · Caching · Transactions</small>"]
    Handler --> Service["<b>Service</b><br/><small>Business logic · Validation · Audit logging</small>"]
    Service --> Repo["<b>Repository</b><br/><small>Drizzle ORM · Field selection · RLS enforcement</small>"]
    Repo --> DB[("PostgreSQL")]
```

### Layer responsibilities

| Layer            | Location                            | Allowed dependencies                                                        |
| ---------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| **Transport**    | `graphql/resolvers/` `rest/routes/` | Handlers only — never services or repositories                              |
| **Handlers**     | `handlers/`                         | Services only — never repositories                                          |
| **Services**     | `services/`                         | Repositories and adapter ports (cache, email, storage, jobs)                |
| **Repositories** | `repositories/`                     | Database schemas from `@grantjs/database` only — never services or handlers |

### Composition root

Dependency injection is wired in `middleware/context.middleware.ts`. On every request the middleware:

1. Creates repository, service, and handler instances
2. Sets up a per-request RLS transaction context (when enabled)
3. Builds the `Grant` RBAC engine instance via `GrantService`
4. Attaches the full context — `{ grant, user, handlers, resourceResolvers, origin, locale }` — to the request

Background jobs and startup tasks use a separate `lib/app-context.lib.ts` factory that builds the same object graph outside the HTTP lifecycle.

## Multi-Tenancy Model

Grant uses account-based multi-tenancy. Each account is a fully isolated tenant with its own organizations, projects, and users:

```bmermaid
graph LR
    subgraph "Account: Acme Corp"
        A1[Organization A]
        A2[Project Alpha]
        A3[Project Beta]
        A4[Users A1–A10]
    end

    subgraph "Account: Beta Inc"
        B1[Organization B]
        B2[Project Gamma]
        B3[Project Delta]
        B4[Users B1–B15]
    end

    A1 --> A2
    A1 --> A3
    A2 --> A4
    A3 --> A4

    B1 --> B2
    B1 --> B3
    B2 --> B4
    B3 --> B4

    A1 -.->|Isolated| B1
    A2 -.->|Isolated| B2
    A4 -.->|Isolated| B4
```

Isolation is enforced at two layers:

- **Application layer** — every query is scoped to the authenticated user's account via tenant-aware repositories
- **Database layer** — PostgreSQL Row-Level Security policies on all pivot tables ensure isolation even if application logic is bypassed

See [Multi-Tenancy](/architecture/multi-tenancy) for the full data model and scoping rules.

## Permission Evaluation

```bmermaid diagram-narrow
flowchart TD
    Start([User Request]) --> Auth{Authenticated?}
    Auth -->|No| Deny[Access Denied]
    Auth -->|Yes| CheckRole{Has Role?}
    CheckRole -->|No| Deny
    CheckRole -->|Yes| CheckPerm{Has Permission?}
    CheckPerm -->|No| Deny
    CheckPerm -->|Yes| CheckScope{In Scope?}
    CheckScope -->|No| Deny
    CheckScope -->|Yes| Allow[Access Granted]

    style Start stroke:#2563eb,stroke-width:3px
    style Allow stroke:#10b981,stroke-width:2px
    style Deny stroke:#ef4444,stroke-width:2px
```

The RBAC engine evaluates in this order: authenticate → resolve roles → check permissions → evaluate scope conditions. Conditions support attribute-based rules (e.g. "only if the user owns the resource") on top of the role-based model. See [RBAC](/architecture/rbac) for the full permission model.

## Technology Stack

### Backend

| Technology        | Purpose                                  |
| ----------------- | ---------------------------------------- |
| **Node.js**       | Runtime                                  |
| **TypeScript**    | Type-safe development (strict mode)      |
| **Express**       | HTTP framework                           |
| **Apollo Server** | GraphQL engine                           |
| **Drizzle ORM**   | Type-safe database access and migrations |
| **PostgreSQL**    | Primary database with RLS                |
| **Redis**         | Caching, sessions, job queues            |
| **Pino**          | Structured JSON logging                  |
| **Zod**           | Runtime schema validation                |

### Frontend

| Technology                | Purpose                      |
| ------------------------- | ---------------------------- |
| **Next.js 15**            | React framework (App Router) |
| **React 19**              | UI library                   |
| **TypeScript**            | Type safety                  |
| **Apollo Client**         | GraphQL data layer           |
| **Tailwind CSS**          | Utility-first styling        |
| **next-intl**             | Internationalization         |
| **Zustand**               | Client state management      |
| **React Hook Form + Zod** | Form handling and validation |

### Infrastructure

| Technology                  | Purpose                                |
| --------------------------- | -------------------------------------- |
| **Docker / Docker Compose** | Containerization and local development |
| **GitHub Actions**          | CI/CD pipeline                         |

## Design Principles

1. **Type safety across the stack** — Types generated from the GraphQL schema (`@grantjs/schema`) are the single source of truth used by resolvers, handlers, services, repositories, and the web client.

2. **Hexagonal architecture** — Domain logic depends only on ports defined in `@grantjs/core`. Infrastructure adapters (database, cache, storage, email, jobs, logging) are injected at the composition root and can be swapped without changing business logic.

3. **Security by default** — Multi-tenant isolation via RLS, RBAC on every endpoint, bcrypt password hashing, JWT/JWKS signing with key rotation, and comprehensive audit logging.

4. **Strict layer boundaries** — Each package has a single responsibility and explicit imports. Handlers never touch repositories; repositories never touch services. The composition root (`context.middleware.ts`) is the only place that wires layers together.

---

**Next:** Learn about [Multi-Tenancy](/architecture/multi-tenancy) to understand how organizations and projects are isolated.
