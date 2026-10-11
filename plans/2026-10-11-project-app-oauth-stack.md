# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Brief: [2026-10-11-project-app-oauth-brief.md](./2026-10-11-project-app-oauth-brief.md).

## Metadata

- **Slug**: `project-app-oauth`
- **Story brief**: [plans/2026-10-11-project-app-oauth-brief.md](./2026-10-11-project-app-oauth-brief.md)
- **Status**: approved — Gate 2 passed 2026-10-11 by Alejandro
- **Story trunk**: `feat/project-app-oauth`
- **worktree_path**: current worktree unless another story is in flight

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [x] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

## Ordered slices (PRs)

| #     | Branch                           | Base                      | Concern                                      | Owner role | Review bar    | PR  |
| ----- | -------------------------------- | ------------------------- | -------------------------------------------- | ---------- | ------------- | --- |
| 1     | `feat/project-app-oauth-db`      | `feat/project-app-oauth`  | `project_oauth_grants` + refresh TTL env     | Backend    | security-full |     |
| 2     | `feat/project-app-oauth-api`     | slice 1                   | PKCE, code, token endpoint, OpenAPI          | Backend    | security-full |     |
| 3     | `feat/project-app-oauth-metadata`| slice 2                   | RFC 8414 + twin openid-configuration         | Backend    | security-full |     |
| 4     | `feat/project-app-oauth-web`     | slice 3                   | Hosted + Test OAuth PKCE/code                | Frontend   | security-full |     |
| 5     | `feat/project-app-oauth-docs`    | slice 4                   | Docs, e2e, minor BREAKING changeset          | QA / docs  | light         |     |
| final | `feat/project-app-oauth`         | `main`                    | integration (Gate 4 — human)                 | Principal  | deep + security-full |     |

### Slice intent (in scope / out of scope)

**1 — database + refresh TTL env.** Drizzle `project_oauth_grants` (+ audit table). Hashed refresh secret, project-app + user FKs, tenant scope columns, soft-delete. Env: `PROJECT_OAUTH_REFRESH_TOKEN_EXPIRATION_DAYS` (default 30) in `@grantjs/env`, `env.config.ts`, config-app metadata, `.env.example`. **Out:** handlers, token endpoint, UI. No RLS (same as `project_apps`: tenant via application scope). Do **not** extend `user_sessions`.

**2 — API.** PKCE on authorize; consent returns `code` (query); remove fragment implicit. `POST /api/auth/project/token` (`authorization_code` + rotating `refresh_token`); optional `client_secret` for confidential apps. Port + repo + service for grants. OpenAPI. Shared authorize/token URLs. **Out:** `user_sessions`, `POST /api/auth/refresh`, DPoP, `id_token`, `client_credentials`, hosted UI, discovery documents.

**3 — metadata.** RFC 8414 authorization-server metadata with well-known inserted **before** the issuer path, plus twin `{iss}/.well-known/openid-configuration` returning the **same JSON**. Document that Grant is not an OP. Per-project `iss` + `jwks_uri`. **Out:** new token grants, UI.

**4 — web.** Hosted sign-in/consent and dashboard Test OAuth switch to PKCE + authorization code. i18n as needed. **Out:** platform login/register OAuth.

**5 — docs / e2e / changeset.** Update `docs/architecture/security.md`, `docs/core-concepts/project-oauth.md`, configuration tables. Extend `project-oauth.e2e.test.ts`. Minor BREAKING changeset (not major).

Each slice: Verifier (typecheck, lint, tests, layers, OpenAPI as applicable). Slices 1–4: Senior Security (not the author).

## Stack setup

```sh
git switch -c feat/project-app-oauth main && git push -u origin feat/project-app-oauth
gh stack init --base feat/project-app-oauth feat/project-app-oauth-db
# after each slice:
gh stack submit --auto
gh stack link --base feat/project-app-oauth <pr> <pr>
# before the next slice:
gh stack add feat/project-app-oauth-<next>
```

Never root the stack on `main`. `gh stack merge` is a human command. Do not merge `feat/project-app-oauth` → `main` (Gate 4).

## Dependencies / notes

- Gate 2 passed 2026-10-11 by Alejandro.
- Shared `/api/auth/project/token` and `/api/auth/project/authorize`; per-project `iss` + `jwks_uri`.
- RFC 8414 well-known inserted **before** issuer path.
- Reuse `signProjectScopedToken` and project JWKS. Pattern-only reuse of `UserSessionService` refresh rotation.
- Authorization codes are short-lived (cache), refresh secrets are persisted (hashed).
- Public ProjectApps = PKCE, no secret. Confidential = `clientSecretHash` on token requests.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-10-11 by Alejandro.
- [ ] Gate 3: Stack PRs merged into trunk (security-full on 1–4).
- [ ] Gate 4: Story → `main` deep review complete — **human only**.

## Cleanup

- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
