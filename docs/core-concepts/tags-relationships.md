---
title: Tags & Relationships
description: Generic labeling system for cross-cutting categorization
---

# Tags & Relationships

Tags are a generic labeling system that lets you categorize and filter entities across your projects. Each tag has a `name` and a `color`, and can be attached to any taggable entity.

## Taggable Entities

Tags can be applied to the following entities via dedicated pivot tables:

| Entity           | Pivot service             | Example use                                      |
| ---------------- | ------------------------- | ------------------------------------------------ |
| **Resource**     | `IResourceTagService`     | Group related resources (e.g. "billing", "auth") |
| **User**         | `IUserTagService`         | Label users by team or department                |
| **Role**         | `IRoleTagService`         | Categorize custom roles                          |
| **Group**        | `IGroupTagService`        | Organize permission groups                       |
| **Permission**   | `IPermissionTagService`   | Tag permissions by domain                        |
| **Organization** | `IOrganizationTagService` | Classify organizations                           |
| **Project**      | `IProjectTagService`      | Label projects by environment or purpose         |
| **Project App**  | `IProjectAppTagService`  | Label apps by purpose or environment             |
| **Account**      | `IAccountTagService`      | Tag accounts                                     |

Each pivot relationship supports an optional `isPrimary` flag to designate a primary tag per entity.

## Scope Behavior

Tags follow the same tenant scoping rules as all other entities:

- A tag created in an **Account** scope is only visible within that account
- A tag created in an **Organization** scope is only visible within that organization
- A tag created in a **Project** scope (either `AccountProject` or `OrganizationProject`) is only visible within that project

When a tag is deleted, it is automatically removed from all entity pivot tables within the scope in a single transaction.

## Intersection Filtering

All entity queries that support tags use **intersection filtering** — when you provide multiple `tagIds`, only entities that have **all** specified tags are returned.

```
GET /resources?tagIds=tag-1,tag-2,tag-3
```

This is equivalent to an AND filter: return resources tagged with `tag-1` AND `tag-2` AND `tag-3`. The intersection is computed at the pivot table level before the main entity query runs, keeping the operation efficient.

## CRUD Operations

Tags support standard CRUD via GraphQL mutations:

| Operation | Mutation     | Permission   |
| --------- | ------------ | ------------ |
| Create    | `createTag`  | `Tag:Create` |
| Update    | `updateTag`  | `Tag:Update` |
| Delete    | `deleteTag`  | `Tag:Delete` |
| List      | `tags` query | `Tag:Query`  |

Attaching and detaching tags from entities is handled through entity-specific mutations (e.g. adding a tag to a resource is part of the resource mutation flow, not the tag mutation flow).

## Tag color palette

Tag colors are defined in `@grantjs/constants` and must be **perceptually distinct**. We use the **CIEDE2000 (ΔE00)** metric in LAB space, comparing each color at **Tailwind shade 500**. Every pair of palette colors must have ΔE00 ≥ `MIN_PALETTE_DELTA_E` (see `packages/@grantjs/constants/src/colors.ts`). This avoids ambiguous choices (e.g. multiple near-identical grays). The palette check is enforced in CI via `pnpm --filter @grantjs/constants run check:palette`. When adding or changing tag colors, ensure the script passes.

---

**Related:**

- [Resources](/core-concepts/resources) — Taggable resource entities
- [Data Model](/architecture/data-model) — Entity relationships and pivot tables
- [RBAC System](/architecture/rbac) — Permission evaluation for tag operations
