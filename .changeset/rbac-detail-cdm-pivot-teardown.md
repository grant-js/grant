---
'grant-api': minor
---

RBAC detail UX, direct permission assignments, and CDM replace pivot teardown.

**Web**

- Settings-style feature module cards and dedicated `/new` + detail routes for roles, groups, permissions, resources, project apps, and users
- Slim list edit dialogs (scalar fields only); relationship editing on detail pages
- Paginated tag pickers, detail table column visibility, and sync job detail pages

**API & database**

- Direct assignment pivots: `user_groups`, `user_permissions`, `role_permissions`, and project-scoped mirrors
- CDM import/export for explicit user→group and user→role permission paths (no synthetic roles)
- Replace-mode CDM teardown sweeps orphan pivots (including `project_app_tags`) with monotonic microsecond stagger soft-delete
- Scoped entity tag resolvers; slim GraphQL list queries (`getRolesList`, `getGroupsList`, etc.)

**Testing & tooling**

- E2E coverage for rich replace import teardown and direct `users[].groups` authorization
- RBAC list-query benchmark script; gitignore ephemeral benchmark outputs under `docs/benchmarks/`
