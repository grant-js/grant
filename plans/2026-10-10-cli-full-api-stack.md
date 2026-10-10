# Stack plan: cli-full-api

- **Slug**: `cli-full-api`
- **Story brief**: [2026-10-10-cli-full-api-brief.md](./2026-10-10-cli-full-api-brief.md)
- **Status**: approved (Gate 2 — 2026-10-10 Alejandro)
- **Story trunk**: `feat/cli-full-api`
- **Review bar**: security-full on transport + refresh

No database migration. CLI + REST refresh + OpenAPI ids + docs.

## Active roles

- Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier

## Ordered slices (into `feat/cli-full-api`)

| #     | Branch                      | Concern                                                                 | Review bar    |
| ----- | --------------------------- | ----------------------------------------------------------------------- | ------------- |
| 1     | `feat/cli-full-api-transport` | Shared HTTP, `GRANT_*` env, `--output`, `whoami`, origin-verify       | security-full |
| 2     | `feat/cli-full-api-api`     | `grant api` raw REST                                                    | security-full |
| 3     | `feat/cli-full-api-openapi` | `operationId`s + vendored operations list                               | light         |
| 4     | `feat/cli-full-api-commands` | Generated `grant <resource> <verb>`                                   | light         |
| 5     | `feat/cli-full-api-docs`    | Agent cookbook + tests                                                  | light         |
| 1b    | `feat/cli-full-api-refresh` | Optional body refresh token on `POST /api/auth/refresh`                 | security-full |
| final | `feat/cli-full-api` → `main` | Integration + changeset on `@grantjs/cli`                             | deep          |
