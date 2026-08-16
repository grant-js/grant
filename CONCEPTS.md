# Concepts

The shared vocabulary of the Grant platform. One term per concept, used the same way in the database, services, ports, and transport surfaces.

This file is **descriptive first**: it records the canonical term _and_ the places where the codebase currently disagrees with itself. A divergence listed here is a known debt, not a licence to add another spelling. When writing new code, use the canonical term.

Renaming existing divergences is separate work — several have reached the GraphQL schema, REST paths, or persisted data, where a rename is a breaking change. Divergences are tagged **internal** (safe to unify) or **contract** (needs a versioning decision).

Findings that produced this file: [Code quality: `apps/api`](./docs/contributing/code-quality/api.md#tier-5-ubiquitous-language).

---

## Tenancy and scoping

### Scope

The `{ tenant, id }` pair that bounds every authorized operation. Passed through transport into handlers, which use it to resolve the set of entity IDs the caller may see.

### Tenant

The **discriminator** on a `Scope` — which _kind_ of boundary the `id` refers to. Defined in `packages/@grantjs/schema` as: `account`, `accountProject`, `accountProjectUser`, `organization`, `organizationProject`, `organizationProjectUser`, `projectUser`, `system`.

> **Known divergence — internal.** `Tenant` names a scope _kind_, not a tenant. There is no `tenantId` anywhere in the codebase; the actual tenancy roots are `accountId` (260 occurrences) and `organizationId` (462). "Scope kind" would be the accurate name. Read `Tenant` as a discriminator, never as an entity.

For composite tenants the `id` is a delimited string — `organizationId:projectId` for `organizationProject`, and so on. Parse it through a single helper rather than calling `.split(':')` inline.

> **Known divergence — internal.** `scope.id.split(':')` is re-implemented in 8 places. The docs also disagree on the format's own name: `orgId:projectId` in `rest/openapi/project-apps.openapi.ts:51` vs `organizationId:projectId` in `handlers/base/cache-handler.ts:182`.

### Account vs Organization

The two tenancy roots. An **account** is a personal workspace; an **organization** is a shared one. Personal accounts have no account-level roles, users, groups, permissions, or tags — those exist only at project level (see `handlers/base/cache-handler.ts:280`).

### Organization member

A user's membership in an organization. Stored in the `organization_users` table (`organizationId`, `userId`).

> **Known divergence — contract.** Two full stacks serve this one table:
>
> | "user"                                                                             | "member"                                                                                 |
> | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
> | `services/organization-users.service.ts`                                           | `services/organization-members.service.ts`                                               |
> | `repositories/organization-users.repository.ts`                                    | `repositories/organization-members.repository.ts`                                        |
> | `IOrganizationUserService` / `IOrganizationUserRepository` (`@grantjs/core` ports) | `IOrganizationMemberService` / `IOrganizationMemberRepository` (`@grantjs/core` ports)   |
> | —                                                                                  | `handlers/organization-members.handler.ts`, `rest/routes/organization-members.routes.ts` |
>
> GraphQL and REST expose _member_ (`organizationMembers`, `updateOrganizationMember`). The database, ports, and half the services say _user_. `repositories/organization-users.repository.ts:104` uses both terms in one comment.
>
> The fork reaches the physical layer too: the table is `organization_users` (`packages/@grantjs/database/src/schemas/organization-users.schema.ts:17`), and every index, foreign key, and audit-log table built on it carries the `organization_users` prefix. With the divergence now cited at the API layer (pass 1), the port layer (pass 3), and the table layer (pass 4), reconciling it is no longer a rename — it is a migration **plus** a contract change.
>
> **Canonical: `member`** for the relationship, `user` for the person. A user _is_ a person; a member _is_ that person's membership in an organization. New code should use `member` when it means the relationship. **No rename is planned**; the cost above is the reason.

### `organization`, not `org`

Spell it out in identifiers.

> **Known divergence — contract.** `orgId` (22 occurrences) survives alongside `organizationId` (462), and both `org` and `prj` are baked into a public URL: `/org/:orgId/prj/:projectId/.well-known/jwks.json` (`rest/routes/jwks.routes.ts:45`). `prj` appears nowhere else in the codebase. The prefix `'org-prj-'` in `services/signing-keys.service.ts:41` is also a persisted key format. Changing either breaks published JWKS consumers.

---

## Layers

The terms below are load-bearing — `AGENTS.md` forbids using them outside their layer.

| Term           | Location                                                     | Meaning                                                                                                     |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Handler**    | `apps/api/src/handlers/`                                     | Transport orchestrator extending `CacheHandler`. The only thing GraphQL resolvers and REST routes may call. |
| **Service**    | `apps/api/src/services/*Service`                             | Business logic, validation, audit, and events. Never imports handlers.                                      |
| **Repository** | `apps/api/src/repositories/`                                 | Database access only. No validation, no audit, no cache.                                                    |
| **Lib**        | `apps/api/src/lib/**/*.lib.ts`                               | Stateless helpers. Never a `CacheHandler`.                                                                  |
| **Port**       | `packages/@grantjs/core/src/ports/`                          | An interface the domain owns and adapters implement. Handlers inject ports, never concrete classes.         |
| **Adapter**    | `packages/@grantjs/{cache,storage,email,jobs,logger,errors}` | A port implementation. Receives `ILogger`/config by injection; never reads env vars.                        |

**CDM entity** (`*CdmEntity`, in `apps/api/src/lib/cdm/entities/`) implements the `ICdmEntityHandler` port. Despite the port's name, these are **not** transport handlers — do not name them `*Handler` or move them into `handlers/`.

---

## Project sync

The async job envelope and the two operations it wraps.

| Term                 | Meaning                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Project sync job** | The job record and its lifecycle — `ProjectSyncJobService`, `project_sync_jobs`. The public API keeps the `ProjectSync*` prefix. |
| **CDM import**       | Applying a CDM payload to a project — `ProjectImportService`.                                                                    |
| **CDM export**       | Snapshotting a project into a CDM payload — `ProjectExportService`.                                                              |

Import and export are invoked by the worker, not directly by transport handlers.

> **Known divergence — contract.** REST uses a third vocabulary that never lines up 1:1 with the GraphQL operations:
>
> | REST                           | GraphQL              |
> | ------------------------------ | -------------------- |
> | `POST /:id/sync/jobs`          | `startProjectSync`   |
> | `POST /:id/sync/jobs/export`   | `startProjectExport` |
> | `DELETE /:id/sync/jobs/:jobId` | `cancelProjectSync`  |
>
> "Sync" is the envelope; "import"/"export" are the operations. REST collapses the two levels.

---

## Pagination

Lists return `{ items, totalCount, hasNextPage }`. Paging is **offset-based** — `page` and `limit`, not cursors. `hasNextPage` keeps its Relay-flavoured name because it is already on the public GraphQL and REST contracts; nothing behind it is keyset, and `cursor` appears nowhere in `apps/api`.

Two strategies compute it, both in [`pagination.lib.ts`](./apps/api/src/lib/pagination.lib.ts). Pick by whether the list mutates under the reader:

| Strategy                                                                  | Helper               | Cost                                       | Used by                                                                                |
| ------------------------------------------------------------------------- | -------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| **Count-based** — compare the page window to a separate `count(*)`        | `hasNextPageByCount` | free (the count is on the contract anyway) | `EntityRepository` and everything built on it, organization members, project sync jobs |
| **Over-fetch** — request `limit + 1`, treat the surplus row as the signal | `takePage`           | one extra row                              | webhook delivery attempts, notifications                                               |

Count-based reads two snapshots — the page and the count — so a concurrent insert or delete between them can announce a next page that is not there. Over-fetch draws the answer from the same snapshot as the page, so it cannot disagree with the rows the caller just received. That is why the two append-heavy lists use it and the CRUD entity lists do not.

> **Known divergence — internal.** `project-sync-job.repository.ts` treats `limit: -1` as "return nothing" (`items: []` with a real `totalCount`), while `EntityRepository` treats it as "return everything". Neither `hasNextPage` helper hides this — the sync-job list simply reports `hasNextPage: false` over an empty page. Changing it alters a public response, so it is tracked separately rather than folded into the pagination cleanup.

---

## Naming conventions

| Kind                  | Form                           | Example                                            |
| --------------------- | ------------------------------ | -------------------------------------------------- |
| Files                 | kebab-case with a layer suffix | `organization-members.service.ts`                  |
| Service schemas       | co-located, plural suffix      | `groups.schemas.ts`                                |
| Classes               | PascalCase, layer suffix       | `GroupService`, `GroupRepository`, `GroupHandler`  |
| Ports                 | `I` + entity + layer           | `IGroupService`, `IGroupRepository`                |
| Entity nouns          | **singular** in class names    | `TagService`, not `TagsService`                    |
| Lookup by primary key | `get<Entity>By<Field>`         | `getUserById`, `getOrganizationBySlug`             |
| Lookup by secondary   | `find<Entity>By<Field>`        | `findUserByEmail` (nullable / non-canonical key)   |
| GraphQL resolvers     | one file per operation         | `create-group.resolver.ts` → `createGroupResolver` |
| REST router factories | `create<Entity>Router`         | `createGroupsRouter`                               |

> **Known divergences — internal.** Handler classes split singular/plural (`TagHandler` vs `ApiKeysHandler`); `repositories/common/EntityRepository.ts` and `PivotRepository.ts` are the only PascalCase filenames in `src/`; two files use `.schema.ts` against 45 using `.schemas.ts`; router factories split `create*Router` vs `create*Routes`; `lib/` mixes `.lib.ts` with bare filenames.
>
> **`get` vs `find`:** intended distinction is primary-key/canonical/list (`get`) vs secondary-key/nullable (`find`). About 83% of `@grantjs/core` port methods follow it (54 `get*By*` vs 11 `find*By*` for the same semantic shape) — see [code-quality/core.md § Tier 5](./docs/contributing/code-quality/core.md#getbyx-vs-findbyx-for-the-identical-semantic-operation--one-convention-mostly-unfollowed). New methods should follow the convention; renaming the existing outliers is a separate story.

### GraphQL operation documents — two spellings

`packages/@grantjs/schema/src/operations/` is split **62 camelCase / 53 kebab-case** (`updateRole.graphql` vs `update-webhook-subscription.graphql`), while all 425 files under `src/schema/` are kebab-case. So the repo convention in the table above already covers this; only `src/operations/` departs from it.

**Decided 2026-08-16: kebab-case** ([code-quality/schema.md § D1](./docs/contributing/code-quality/schema.md#recorded-decisions)). New operation documents take it now; the 62 existing renames are a follow-up story, because they touch every consumer import and want a diff a reviewer can read as "renames only."

### One schema, two exported names

Two zod schemas are exported under a second name that adds no meaning. Both names are live, so this is a rename, not dead code — it is recorded here rather than fixed, per the pass-1 decision to settle vocabulary before renaming.

| Concept                        | Competing spellings                                                                                                    | Split                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Arbitrary JSON metadata column | `jsonSchema` and `metadataSchema` ([`services/common/schemas.ts:164,166`][json])                                       | REST schemas say `jsonSchema`; service schemas say `metadataSchema`         |
| Webhook list query             | `webhookScopeQuerySchema` and `listWebhookSubscriptionsQuerySchema` ([`webhook-subscriptions.schemas.ts:25,30`][hook]) | The alias is used by the list route; the base name by the two detail routes |

[json]: https://github.com/grant-js/grant/blob/main/apps/api/src/services/common/schemas.ts
[hook]: https://github.com/grant-js/grant/blob/main/apps/api/src/rest/schemas/webhook-subscriptions.schemas.ts

Because both are naming decisions rather than defects, `knip` runs with `duplicates` excluded — see [`knip.json`](https://github.com/grant-js/grant/blob/main/knip.json). Re-enable that check when the names are settled.

---

## Web UI vocabulary

### "Workspace"

`apps/web` introduces **workspace** as a UI-facing synonym for `Account` (`AccountType.Personal | Organization` on the GraphQL contract) — the personal or organizational thing the caller is currently acting as. Used in [`components/common/workspace-switcher.tsx`](./apps/web/components/common/workspace-switcher.tsx) (`WorkspaceSwitcherProps`, `currentWorkspace`) and the `t('workspace')` i18n label in four sidebar components (`project-sidebar.tsx`, `organization-sidebar.tsx`, `organization-workspace-sidebar.tsx`, `personal-workspace-sidebar.tsx`).

> **Known divergence — internal, not a rename candidate.** 39 occurrences of "workspace" exist in `apps/web`, none in `@grantjs/schema` or any REST/GraphQL contract surface — it never crosses into the wire format. **Canonical: `Account`** for anything that touches the contract, database, or cross-package code; `workspace` stays as the UI's own vocabulary for presenting an account to a human, the way "workspace" reads more naturally than "account" in a switcher menu. Recorded here so a future contributor doesn't wonder whether it's a queryable field — it is not. See [code-quality/web.md § Tier 5](./docs/contributing/code-quality/web.md#workspace--a-deliberate-ui-only-synonym-for-account).

---

## Adding a term

Add an entry when a concept has (a) more than one plausible name, or (b) a name that already appears with two spellings in the codebase. Cite at least one `file:line` for each competing spelling — an undocumented divergence gets rediscovered by the next audit pass.
