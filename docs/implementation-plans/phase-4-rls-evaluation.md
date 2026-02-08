# Phase 4: Row-Level Security (RLS) – Implementation Evaluation

This document evaluates what it would take to implement Phase 4 (RLS) from the [Multi-Tenant Security Roadmap](./multi-tenant-security-roadmap.md), given the current Grant platform schema, connection model, and request flow. Phases 1–3 are assumed complete.

## 1. Goal (from roadmap)

- **Goal:** Introduce database-level RLS as defense in depth so that a missing `WHERE scope/tenant_id` in application code cannot return other tenants’ rows.
- **Scope:** Evaluation +, if adopted, implementation of RLS on critical tenant-scoped tables and wiring of session context from auth.

---

## 2. Schema mapping to RLS

### 2.1 Tenant model in Grant

Grant uses a **two-level tenant model** (organization and project) plus account:

- **Organization** – container for projects and users; many tables are scoped by `organization_id`.
- **Project** – isolated environment; many tables are scoped by `project_id`.
- **Account** – person’s identity; can access projects via `account_projects`; some scopes use `accountId:projectId`.

Request scope is `{ tenant: Tenant, id: string }` where `Tenant` is an enum and `id` can be composite (e.g. `organizationId:projectId` for `organizationProject`).

### 2.2 Tables by tenant key

**Organization-scoped (have `organization_id`):**

| Table                           | RLS policy (concept)                                                     |
| ------------------------------- | ------------------------------------------------------------------------ |
| `organization_users`            | `organization_id = current_setting('app.current_organization_id')::uuid` |
| `organization_roles`            | same                                                                     |
| `organization_groups`           | same                                                                     |
| `organization_permissions`      | same                                                                     |
| `organization_projects`         | same (and optionally filter by `current_project_id` when set)            |
| `organization_invitations`      | same                                                                     |
| `organization_tags`             | same                                                                     |
| `organization_project_tags`     | `organization_id` + optionally `project_id`                              |
| `organization_project_api_keys` | same                                                                     |

**Project-scoped (have `project_id`):**

| Table                      | RLS policy (concept)                                           |
| -------------------------- | -------------------------------------------------------------- |
| `project_users`            | `project_id = current_setting('app.current_project_id')::uuid` |
| `project_roles`            | same                                                           |
| `project_groups`           | same                                                           |
| `project_permissions`      | same                                                           |
| `project_resources`        | same                                                           |
| `project_tags`             | same                                                           |
| `project_user_api_keys`    | same                                                           |
| `account_projects`         | same (project_id)                                              |
| `account_project_tags`     | same                                                           |
| `account_project_api_keys` | same                                                           |
| `organization_projects`    | see above                                                      |

**Root / shared tables (no direct tenant column):**

- `organizations` – RLS: `id = current_setting('app.current_organization_id')::uuid` (when org scope) or allow if project scope and project belongs to org (subquery).
- `projects` – RLS: `id = current_setting('app.current_project_id')::uuid` or `id IN (SELECT project_id FROM organization_projects WHERE organization_id = current_setting('app.current_organization_id')::uuid)` when only org is set.
- `users`, `roles`, `groups`, `permissions`, `resources`, `tags` – shared definitions; access is via pivot tables. RLS here is optional or more complex (e.g. “visible if linked from a scoped pivot”).
- `accounts`, `api_keys` – mixed; some usage is account-scoped or project-scoped via pivots.

**Audit log tables** – Can be included in RLS (e.g. by `organization_id` / `project_id` where present) or left for a later phase.

### 2.3 Session variables to set

- **`app.current_organization_id`** – Set when scope is organization or organizationProject (from `scope.id` or first part of `scope.id`).
- **`app.current_project_id`** – Set when scope is project-scoped (projectUser, accountProject, organizationProject, etc.); from `scope.id` or second part of composite `scope.id`.

Scope semantics (from codebase):

- `organization` → `scope.id` = organization id.
- `organizationProject` → `scope.id` = `organizationId:projectId`.
- `accountProject` → `scope.id` = `accountId:projectId`.
- `projectUser` / `accountProjectUser` / `organizationProjectUser` → composite ids include project (and possibly org/account).

So a single **scope → session vars** helper can derive `(current_organization_id, current_project_id)` from `scope.tenant` and `scope.id` (including parsing `:` for composite ids). Unauthenticated or system requests would leave both unset (and rely on RLS bypass or “no rows” behavior; see below).

---

## 3. Connection and session context

### 3.1 Current behavior

- **Single shared pool:** `initializeDBConnection()` creates one `postgres` (postgres.js) client and one Drizzle `db` instance. All requests use the same `db` via `contextMiddleware` → `createRepositories(db)` → `createServices(..., db, ...)`.
- **No per-request connection:** Queries can run on any connection from the pool. Session variables set on one connection are not visible to the next query if it runs on another connection.

So **we must ensure all queries for a given request run on the same connection** and that we set session variables on that connection before any query.

### 3.2 Options for “scoped” requests

**Option A – Request-scoped transaction (recommended baseline):**

1. For requests that have an authenticated scope, start a **transaction** at the entry (middleware or first guard).
2. Inside that transaction, run `SELECT set_config('app.current_organization_id', $1, true)` and `set_config('app.current_project_id', $2, true)` (third arg `true` = transaction-local, so no leak to other requests).
3. Attach the **transaction** (Drizzle’s `Transaction` type) to the request context as the “db” to use for the rest of the request.
4. All handlers/repositories use `context.db` (which is the transaction when scope is present).
5. On response finish (or error), commit or rollback the transaction.

**Implications:**

- Every scoped request runs inside a transaction. Slightly higher latency and hold time; acceptable for typical request patterns.
- Need to ensure **all** DB access for that request goes through `context.db` (no use of a global `getDatabase()` in request path when scope is present).
- Unscoped requests (e.g. login, health) continue to use the global `db`; no RLS vars set, so RLS policies must treat “unset” as “no access” or use a bypass role (see below).

**Option B – Dedicated “scoped connection” from pool:**

- Reserve one connection per scoped request, set session vars on it, pass a Drizzle instance (or client) that uses only that connection for the request, then release. postgres.js does not expose “take one connection from pool” directly; you effectively get it by running a transaction. So this collapses to the same pattern as Option A for our stack.

**Option C – Set vars on every query:**

- Run `set_config(..., true)` in the same transaction as each query. That would require wrapping every repository call in a transaction and setting vars at the start of each – fragile and heavy. Not recommended.

**Conclusion:** Use **Option A**: request-scoped transaction + set_config at start, and pass the transaction as `context.db` for scoped requests.

### 3.3 System user and background jobs

- **System user / app context:** Used for cron, jobs, and server-initiated actions. These should **bypass RLS** (no tenant context). Options:
  - Use a dedicated DB role (e.g. `rls_bypass`) that has `BYPASSRLS` and run those operations as that role, or
  - Keep using the same role but **do not** set `app.current_*` for system; then RLS policies must explicitly allow “no vars set” only for a specific role (e.g. `current_setting('app.role', true) = 'system'`) or use a separate connection/user with RLS disabled.
- **Background jobs (Phase 3):** Jobs already carry tenant context in the payload. When a worker processes a tenant-scoped job, it could:
  - Set session vars from the job’s scope and run the job’s queries in a transaction (same pattern as HTTP), or
  - Continue without RLS for now and rely on application-level checks (acceptable if RLS is “defense in depth” and jobs are validated in Phase 3).

---

## 4. Policy design choices

### 4.1 When vars are unset

- **Strict:** If `current_organization_id` / `current_project_id` are unset, RLS policies return no rows (or deny). So unauthenticated and system traffic must either use a bypass role or not hit RLS-protected tables.
- **Bypass role:** Create a role (e.g. `grant_app_bypass`) with `BYPASSRLS`. Application connects as normal user; for system/jobs, use a connection (or SET ROLE) as `grant_app_bypass` so no RLS is applied. Requires connection or role switch for background jobs and system operations.

### 4.2 Root tables (`organizations`, `projects`)

- **organizations:** Policy can be: `id = current_setting('app.current_organization_id', true)::uuid` (when set); when only project is set, org is not directly visible unless we add a policy that joins through `organization_projects`. Simplest is: only allow org row when `current_organization_id` is set and matches.
- **projects:** Allow when `id = current_setting('app.current_project_id', true)::uuid`, or when `current_organization_id` is set and `id IN (SELECT project_id FROM organization_projects WHERE organization_id = current_setting('app.current_organization_id', true)::uuid)`.

### 4.3 Tables without tenant column (users, roles, groups, permissions, resources, tags)

- Option 1: **No RLS** on these; continue to rely on application-level scope and pivot-table filtering (simplest).
- Option 2: Add RLS that allows rows only if they are referenced by a scoped pivot (complex policies and potential performance impact). Defer unless required for compliance.

---

## 5. Implementation outline (if RLS is adopted)

### 5.1 Migrations

1. **Session variables (optional but recommended):** Ensure PostgreSQL supports custom GUCs (default).
2. **Enable RLS on selected tables:**  
   `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
3. **Create policies** for:
   - Organization-scoped tables: `USING (organization_id = current_setting('app.current_organization_id', true)::uuid)` (and for pivots with both org and project, add project check when `current_project_id` is set).
   - Project-scoped tables: `USING (project_id = current_setting('app.current_project_id', true)::uuid)`.
   - `organizations`: `USING (id = current_setting('app.current_organization_id', true)::uuid)`.
   - `projects`: combination of `current_project_id` and `current_organization_id` as above.
4. **Bypass role (optional):** Create role with `BYPASSRLS`; use for migrations and, if desired, for system/job connections.

Start with a **small set of critical tables** (e.g. `project_users`, `organization_users`, `organization_projects`, `project_resources`, `organizations`, `projects`) and expand after validation.

### 5.2 Application changes

| Area                     | Change                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope → session vars** | Add `scopeToRlsContext(scope)` → `{ organizationId?: string; projectId?: string }` (parse composite `scope.id` per tenant type).                                                                   |
| **Context / middleware** | For requests with scope: start transaction, run `set_config` for both vars (via raw SQL or Drizzle `sql`), attach transaction to `context.db`; ensure response/error path commits or rolls back.   |
| **Context type**         | Extend so `context.db` can be `DbSchema \| Transaction` (or a wrapper that holds either). Repositories already accept optional `transaction`; they would use `context.db` when it’s a transaction. |
| **Request pipeline**     | Ensure no handler or service uses a global `getDatabase()` when handling a scoped request; all use `context.db`.                                                                                   |
| **Unscoped requests**    | No transaction; `context.db` remains the global `db`. RLS policies must treat unset vars as “no access” for normal app role.                                                                       |
| **System / jobs**        | Either use bypass role for DB connections used by jobs and app context, or do not set session vars and accept that RLS blocks access unless bypass role is used.                                   |

### 5.3 Files to touch (non-exhaustive)

- **Migrations:** New migration(s) in `packages/@grantjs/database/src/migrations/` to enable RLS and add policies (and optional bypass role).
- **API:**
  - `apps/api/src/lib/rls-context.ts` (or similar) – `scopeToRlsContext(scope)`, `setRlsContext(tx, context)`.
  - `apps/api/src/middleware/context.middleware.ts` – optionally start transaction and set RLS vars when scope present; attach `tx` as `context.db`.
  - `apps/api/src/types/context.ts` – `db` as `DbSchema | Transaction` (or wrapper).
  - Repositories/handlers – use `context.db` consistently; ensure no global `getDatabase()` in request path for scoped routes.
- **Docs:** `docs/architecture/security.md` (RLS section), `docs/architecture/multi-tenancy.md` (reference to RLS and session vars).

---

## 6. Effort and risks

### 6.1 Effort (order-of-magnitude)

| Task                                                      | Estimate                              |
| --------------------------------------------------------- | ------------------------------------- |
| Scope → session vars helper + tests                       | 0.5 day                               |
| Middleware: transaction + set_config + attach to context  | 1 day                                 |
| Context type and wiring (db vs tx) across handlers/repos  | 1–2 days                              |
| Migrations: enable RLS + policies (critical tables first) | 1–2 days                              |
| Bypass role + system/job connection handling              | 0.5–1 day                             |
| Testing (unit + integration; isolation tests)             | 1–2 days                              |
| Documentation and rollout (feature flag optional)         | 0.5 day                               |
| **Total**                                                 | **~5–9 days** (1–2 weeks with buffer) |

### 6.2 Risks and mitigations

| Risk                                               | Mitigation                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Performance: every scoped request in a transaction | Measure; keep transactions short; use connection pool sizing.                                                 |
| Missing `context.db` in one code path              | Audit all DB access in request path; use `context.db` only; add tests.                                        |
| System/job access broken by RLS                    | Use bypass role or dedicated user for jobs and system; test job processors.                                   |
| Complex policies for root tables                   | Start with simple “id = current\_\*” policies; extend with subqueries only if needed.                         |
| Drizzle/postgres.js transaction API                | Use existing `db.transaction()` and pass `tx`; run raw `set_config` via `tx.execute(sql`...`)` or equivalent. |

### 6.3 Tradeoffs

- **Pros:** Defense in depth; a single missing WHERE clause cannot leak other tenants’ rows; aligns with roadmap and article.
- **Cons:** Extra complexity (transactions, session vars, bypass role); all request-path DB access must go through scoped context; slightly more moving parts in deployments (roles, migrations).

---

## 7. Recommendation

- **Schema:** Maps to RLS cleanly for **organization-scoped** and **project-scoped** tables; root tables (`organizations`, `projects`) need one or two policies each; shared tables (users, roles, etc.) can stay without RLS initially.
- **Connection/session:** Use **request-scoped transaction + set_config** and pass the transaction as `context.db` for scoped requests; no change to connection string or pool size, but consistent use of `context.db` is required.
- **Adoption:** Phased: (1) Implement scope → session vars and middleware/context changes; (2) Enable RLS on a small set of critical tables and validate; (3) Roll out to remaining tenant-scoped tables; (4) Document and optionally add a feature flag to enable/disable RLS for rollout.

If you want to proceed, the next concrete step is to implement the scope → RLS context helper and the middleware that starts the transaction and sets `app.current_organization_id` and `app.current_project_id`, then add one migration enabling RLS on a single table (e.g. `project_users`) and verify end-to-end.
