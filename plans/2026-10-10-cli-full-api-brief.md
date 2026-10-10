# Agent-first Grant CLI (full API on profiles)

- **Slug**: `cli-full-api`
- **Date**: 2026-10-10
- **Status**: approved (Gate 1 — 2026-10-10 Alejandro)
- **Story trunk**: `feat/cli-full-api`
- **Stack plan**: [2026-10-10-cli-full-api-stack.md](./2026-10-10-cli-full-api-stack.md)
- **Review bar**: security-full on transport, origin-verify, and session refresh

## Objective

Agents and scripts can call the Grant REST API through the `grant` CLI using an auth profile (or `GRANT_*` env), without MCP and without importing `@grantjs/client`.

## Acceptance criteria

- [ ] Shared HTTP transport: bearer, scope query, optional `x-origin-verify`, envelope unwrap, exit codes 0 / 1 / 2
- [ ] Credential chain: flags → `GRANT_*` env → `~/.config/grant/config.json` profile
- [ ] `GRANT_PROFILE` honored when `--profile` is omitted
- [ ] `grant whoami` calls `GET /api/me`
- [ ] `grant api <method> <path>` covers the full REST surface
- [ ] OpenAPI paths have stable `operationId`s; CLI vendors a compact operations list
- [ ] Named commands `grant <resource> <verb>` are generated from that spec
- [ ] `POST /api/auth/refresh` accepts an optional `{ refreshToken }` body for session profiles
- [ ] Docs cover JSON output, env, `grant api`, and closed-install origin-verify
- [ ] Command descriptions for REST operations come from OpenAPI only (summary / description). No second endpoint catalog.

## Decision (Gate 1)

OpenAPI is the single source of documentation for endpoints. The CLI must surface those summaries on `--help` and in generated commands. Do not add a parallel agent-help catalog, `grant help --json` tree, or per-command example corpus.

## Non-goals

- MCP server
- GraphQL CLI
- JMESPath `--query`
- MFA/step-up automation
- Shell completions

## Risk flags

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [ ] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII

## Human gate

- [x] Gate 1: Story brief approved
