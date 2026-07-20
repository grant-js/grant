---
title: Data Model
description: Entity overview and relationships in the Grant database
---

# Data Model

Grant stores all data in PostgreSQL using [Drizzle ORM](https://orm.drizzle.team/). The database schemas in `packages/@grantjs/database/src/schemas/` are the single source of truth — the GraphQL types in `@grantjs/schema` are generated from them.

## Entities

| Entity           | Purpose                                                                   | Key relationships                                                                          |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **User**         | A person who can log in                                                   | Owns accounts, belongs to organizations and projects via pivots                            |
| **Account**      | Person-centric identity (personal or organization)                        | Owned by a user; links to projects via `account_projects`                                  |
| **Organization** | Business entity that groups projects and members                          | Contains projects and users via pivot tables                                               |
| **Project**      | Isolated environment for managing external identities                     | Contains resources, users, roles, groups, permissions, API keys, signing keys, apps        |
| **Project App**  | OAuth/consent application in a project                                    | Belongs to a project; tags via `project_app_tags`; scopes and redirect URIs                |
| **Resource**     | Domain entity defined by an external system (e.g. invoice, order, policy) | Belongs to a project; permissions are scoped to resources                                  |
| **Role**         | Named collection of groups                                                | Assigned to users via `user_roles`; contains groups via `role_groups`                      |
| **Group**        | Collection of permissions                                                 | Linked to roles via `role_groups`; may also attach directly to users via `user_groups`     |
| **Permission**   | A specific action on a resource (e.g. `user:read`)                        | Belongs to groups; linked to a resource                                                    |
| **Tag**          | Flexible label for categorization                                         | Applied to users, roles, groups, permissions, organizations, and projects via pivot tables |
| **API Key**      | Programmatic access credential scoped to a project                        | Belongs to a user and a project; exchanged for a JWT                                       |
| **Signing Key**  | RSA key pair for JWT signing (system or per-project)                      | Scoped to system or a project; exposed via JWKS                                            |

## Entity Relationships

The diagrams below are architect-facing EERs. They intentionally omit audit-log tables and tag pivots — every mutable entity has a corresponding `*_audit_logs` table, and tags are an orthogonal labeling layer (see [Tagging](#tagging)).

### Diagram A — Core authorization

Tenant hierarchy plus the RBAC chain. The isolation boundary for authorization data is the **Project**; permission checks resolve as a union of paths that end at **action + resource**.

Many-to-many links are drawn as **pivot entities** (named after the real tables) so every relationship is visible — Mermaid’s bare `}o--o{` edges often drop when entities have attributes.

#### A1 — Tenant hierarchy

```bmermaid
erDiagram
    USER {
        uuid id PK
        varchar name
        jsonb metadata
        timestamp deleted_at
    }
    ACCOUNT {
        uuid id PK
        varchar type
        uuid owner_id FK
        timestamp deleted_at
    }
    ORGANIZATION {
        uuid id PK
        varchar name
        varchar slug
        timestamp deleted_at
    }
    PROJECT {
        uuid id PK
        varchar name
        varchar slug
        varchar description
        timestamp deleted_at
    }
    organization_users {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        timestamp deleted_at
    }
    project_users {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        timestamp deleted_at
    }
    account_projects {
        uuid id PK
        uuid account_id FK
        uuid project_id FK
        timestamp deleted_at
    }
    organization_projects {
        uuid id PK
        uuid organization_id FK
        uuid project_id FK
        timestamp deleted_at
    }

    USER ||--o{ ACCOUNT : "owns"
    USER ||--o{ organization_users : ""
    ORGANIZATION ||--o{ organization_users : ""
    USER ||--o{ project_users : ""
    PROJECT ||--o{ project_users : ""
    ACCOUNT ||--o{ account_projects : ""
    PROJECT ||--o{ account_projects : ""
    ORGANIZATION ||--o{ organization_projects : ""
    PROJECT ||--o{ organization_projects : ""
```

#### A2 — RBAC chain and project scope

```bmermaid
erDiagram
    USER {
        uuid id PK
        varchar name
    }
    PROJECT {
        uuid id PK
        varchar name
        varchar slug
    }
    ROLE {
        uuid id PK
        varchar name
        varchar description
        jsonb metadata
        timestamp deleted_at
    }
    GROUP {
        uuid id PK
        varchar name
        varchar description
        jsonb metadata
        timestamp deleted_at
    }
    PERMISSION {
        uuid id PK
        varchar name
        varchar action
        uuid resource_id FK
        jsonb condition
        timestamp deleted_at
    }
    RESOURCE {
        uuid id PK
        varchar name
        varchar slug
        text[] actions
        boolean is_active
        timestamp deleted_at
    }
    user_roles {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        timestamp deleted_at
    }
    user_groups {
        uuid id PK
        uuid user_id FK
        uuid group_id FK
        timestamp deleted_at
    }
    user_permissions {
        uuid id PK
        uuid user_id FK
        uuid permission_id FK
        timestamp deleted_at
    }
    role_groups {
        uuid id PK
        uuid role_id FK
        uuid group_id FK
        timestamp deleted_at
    }
    role_permissions {
        uuid id PK
        uuid role_id FK
        uuid permission_id FK
        timestamp deleted_at
    }
    group_permissions {
        uuid id PK
        uuid group_id FK
        uuid permission_id FK
        timestamp deleted_at
    }
    project_roles {
        uuid id PK
        uuid project_id FK
        uuid role_id FK
        timestamp deleted_at
    }
    project_groups {
        uuid id PK
        uuid project_id FK
        uuid group_id FK
        timestamp deleted_at
    }
    project_permissions {
        uuid id PK
        uuid project_id FK
        uuid permission_id FK
        timestamp deleted_at
    }
    project_resources {
        uuid id PK
        uuid project_id FK
        uuid resource_id FK
        timestamp deleted_at
    }

    USER ||--o{ user_roles : ""
    ROLE ||--o{ user_roles : ""
    USER ||--o{ user_groups : ""
    GROUP ||--o{ user_groups : ""
    USER ||--o{ user_permissions : ""
    PERMISSION ||--o{ user_permissions : ""
    ROLE ||--o{ role_groups : ""
    GROUP ||--o{ role_groups : ""
    ROLE ||--o{ role_permissions : ""
    PERMISSION ||--o{ role_permissions : ""
    GROUP ||--o{ group_permissions : ""
    PERMISSION ||--o{ group_permissions : ""
    RESOURCE ||--o{ PERMISSION : "defines"
    PROJECT ||--o{ project_resources : ""
    RESOURCE ||--o{ project_resources : ""
    PROJECT ||--o{ project_roles : ""
    ROLE ||--o{ project_roles : ""
    PROJECT ||--o{ project_groups : ""
    GROUP ||--o{ project_groups : ""
    PROJECT ||--o{ project_permissions : ""
    PERMISSION ||--o{ project_permissions : ""
```

Pivot tables use soft-delete-aware unique constraints (`deleted_at IS NULL`). Project scope also adds attachments such as `project_user_groups` and `project_user_permissions` (same pattern; omitted here for readability).

Authorization resolution unions these paths before matching action + resource:

```
User → Role → Group → Permission → Resource
User → Group → Permission → Resource
User → Role → Permission → Resource
User → Permission → Resource
```

### Diagram B — Supporting systems

Integrations and operational entities that hang off a project (and sometimes a user). API keys attach through scope-specific pivots (`account_project_api_keys`, `organization_project_api_keys`, `project_user_api_keys`) rather than a single FK — shown here as scoped edges.

```bmermaid
erDiagram
    USER {
        uuid id PK
        varchar name
    }
    PROJECT {
        uuid id PK
        varchar name
        varchar slug
    }
    API_KEY {
        uuid id PK
        varchar client_id
        varchar client_secret_hash
        varchar name
        boolean is_revoked
        timestamp expires_at
        timestamp deleted_at
    }
    PROJECT_APP {
        uuid id PK
        uuid project_id FK
        varchar client_id
        varchar name
        jsonb redirect_uris
        jsonb scopes
        uuid sign_up_role_id FK
        timestamp deleted_at
    }
    PROJECT_SYNC_JOB {
        uuid id PK
        uuid project_id FK
        varchar scope_tenant
        varchar scope_id
        varchar operation "import | export"
        varchar status
        jsonb payload
        jsonb result
        timestamp deleted_at
    }
    WEBHOOK_SUBSCRIPTION {
        uuid id PK
        uuid project_id FK
        varchar scope_tenant
        varchar scope_id
        varchar url
        varchar secret_ref
        text[] event_types
        varchar ordering_mode
        boolean active
        timestamp deleted_at
    }
    WEBHOOK_DELIVERY_ATTEMPT {
        uuid id PK
        uuid subscription_id FK
        uuid event_id FK
        varchar status
        integer attempt_count
        timestamp delivered_at
    }
    SIGNING_KEY {
        uuid id PK
        varchar scope_tenant
        varchar scope_id
        varchar kid
        text public_key_pem
        varchar algorithm
        boolean active
        timestamp deleted_at
    }

    USER ||--o{ API_KEY : "created_by"
    PROJECT }o--o{ API_KEY : "scoped via account/org/project pivots"
    PROJECT ||--o{ PROJECT_APP : "hosts"
    USER ||--o{ PROJECT_APP : "created_by"
    PROJECT ||--o{ PROJECT_SYNC_JOB : "CDM import/export"
    USER ||--o{ PROJECT_SYNC_JOB : "enqueued_by"
    PROJECT ||--o{ WEBHOOK_SUBSCRIPTION : "delivers events"
    WEBHOOK_SUBSCRIPTION ||--o{ WEBHOOK_DELIVERY_ATTEMPT : "attempts"
    PROJECT ||--o{ SIGNING_KEY : "JWKS scope (or system)"
```

## Tenant Hierarchy

Data is organized in three levels. Each level provides full isolation — there is no data leakage between accounts, and projects within an organization are independent of each other.

```
Account (top-level tenant)
 └── Organization (business entity, groups projects and members)
      └── Project (isolated environment with its own users, roles, resources)
```

- **Account** — A person's identity. One user can own multiple accounts (personal and organization types). Accounts can switch context without re-authenticating.
- **Organization** — Groups related projects and team members. Users can belong to multiple organizations.
- **Project** — A fully isolated environment. Each project manages its own users, roles, groups, permissions, resources, API keys, signing keys, and apps independently.

::: tip
For the full isolation model including Row-Level Security, see [Multi-Tenancy](/architecture/multi-tenancy).
:::

## RBAC Chain

Permissions are evaluated through a union of paths:

```
User → Role → Group → Permission → Resource
User → Group → Permission → Resource
User → Role → Permission → Resource
User → Permission → Resource
```

A user is assigned roles and may have direct group or permission attachments. Each role contains groups and may have direct permissions; each group bundles permissions. Grant resolution unions all sources before matching action + resource.

::: tip
For the complete permission model, evaluation flow, and standard roles, see [RBAC](/architecture/rbac).
:::

## Tagging

Tags provide a generic labeling system for organizing and filtering entities. A tag can be applied to any of the following via a dedicated pivot table:

- Users, Roles, Groups, Permissions, Organizations, Projects, Project Apps

Tags are scoped to the same tenant as the entity they are applied to.

## Audit Logging

Every entity has a corresponding `*_audit_logs` table that records a complete change history. Audit records capture the old and new values, the action performed, and who performed it.

| Event     | Description                 |
| --------- | --------------------------- |
| `CREATE`  | Entity created              |
| `UPDATE`  | Entity modified             |
| `DELETE`  | Entity soft-deleted         |
| `RESTORE` | Entity restored             |
| `ASSIGN`  | Role or permission assigned |
| `REVOKE`  | Role or permission revoked  |

## Common Patterns

All tables in the schema share these conventions:

- **UUID primary keys** — Generated with `gen_random_uuid()`
- **Soft deletes** — `deleted_at` column; records are never physically removed
- **Timestamps** — `created_at` and `updated_at` on every table
- **Composite unique indexes** — Pivot tables enforce uniqueness only where `deleted_at IS NULL`

::: info Schema references

- **Drizzle schemas:** `packages/@grantjs/database/src/schemas/`
- **GraphQL types:** `packages/@grantjs/schema/src/generated/`
- **Migrations:** `pnpm --filter @grantjs/database db:generate` and `db:migrate`
- **Permission evaluation benchmarks:** [Benchmark report](/benchmarks/report)
  :::

---

**Next:** Learn about [Security](/architecture/security) to understand authentication and session management.
